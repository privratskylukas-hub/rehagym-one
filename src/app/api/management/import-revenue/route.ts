import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  const { action } = body;

  // ── Preview: parse XLSX and return rows ────────────────────

  if (action === "preview") {
    try {
      const { file_data } = body;
      const buffer = Buffer.from(file_data, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rawRows.length === 0) {
        return NextResponse.json({ error: "Soubor neobsahuje žádná data" }, { status: 400 });
      }

      // Map columns — try to be flexible with column names
      const rows = rawRows.map((row) => {
        const mapped: Record<string, any> = {};

        // Date
        const dateVal = row["Datum"] || row["datum"] || row["date"] || row["Date"] || "";
        if (dateVal instanceof Date) {
          mapped.date = dateVal.toISOString().split("T")[0];
        } else if (typeof dateVal === "string" && dateVal) {
          // Try various date formats
          const parts = dateVal.split(/[./\-]/);
          if (parts.length === 3) {
            const [d, m, y] = parts;
            mapped.date = `${y.length === 2 ? "20" + y : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          } else {
            mapped.date = dateVal;
          }
        } else {
          mapped.date = null;
        }

        // Category
        mapped.category = row["Kategorie"] || row["KAT"] || row["category"] || row["kat"] || "";
        // Code
        mapped.code = row["Kód"] || row["kod"] || row["code"] || row["Code"] || "";
        // Description
        mapped.description = row["Popis"] || row["popis"] || row["description"] || row["Název"] || "";
        // Client name
        mapped.client_name = row["Klient"] || row["klient"] || row["client_name"] || row["Jméno"] || "";
        // Amount
        const amountVal = row["Částka"] || row["castka"] || row["amount"] || row["Amount"] || row["Cena"] || 0;
        mapped.amount = typeof amountVal === "number" ? amountVal : parseFloat(String(amountVal).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
        // VAT rate
        mapped.vat_rate = parseInt(row["DPH"] || row["dph"] || row["vat_rate"] || "0") || 0;
        // Net amount
        mapped.net_amount = row["Bez DPH"] || row["net_amount"] || null;
        if (mapped.net_amount && typeof mapped.net_amount !== "number") {
          mapped.net_amount = parseFloat(String(mapped.net_amount).replace(/[^\d.,-]/g, "").replace(",", ".")) || null;
        }
        // Payment method
        mapped.payment_method = row["Způsob"] || row["ZPUSUHR"] || row["payment_method"] || row["Úhrada"] || "";
        // Document type
        mapped.document_type = row["Typ dok."] || row["document_type"] || row["Doklad"] || "";
        // Document number
        mapped.document_number = row["Č. dok."] || row["document_number"] || row["Číslo"] || "";
        // Department
        mapped.department = row["Středisko"] || row["stredisko"] || row["department"] || row["Oddělení"] || "";
        // Source
        mapped.source_system = "smartmedix";

        return mapped;
      }).filter((row) => row.date && row.amount);

      return NextResponse.json({
        preview: rows.slice(0, 10),
        rows,
        total: rows.length,
      });
    } catch (err) {
      console.error("XLSX parse error:", err);
      return NextResponse.json({ error: "Chyba při zpracování souboru" }, { status: 500 });
    }
  }

  // ── Import: save rows to database ──────────────────────────

  if (action === "import") {
    try {
      const { rows, file_name, imported_by } = body;

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "Žádná data k importu" }, { status: 400 });
      }

      // Determine period range
      const dates = rows.map((r: any) => r.date).filter(Boolean).sort();
      const periodFrom = dates[0] || null;
      const periodTo = dates[dates.length - 1] || null;

      // Create import batch
      const { data: batch, error: batchError } = await supabase
        .from("import_batches")
        .insert({
          type: "revenue",
          source_system: "smartmedix",
          file_name: file_name || "unknown.xlsx",
          row_count: rows.length,
          period_from: periodFrom,
          period_to: periodTo,
          imported_by: imported_by || null,
        })
        .select("id")
        .single();

      if (batchError) {
        console.error("Batch insert error:", batchError);
        return NextResponse.json({ error: "Chyba při vytváření importu" }, { status: 500 });
      }

      // Insert revenue entries in chunks of 100
      const CHUNK_SIZE = 100;
      let insertedCount = 0;

      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE).map((row: any) => ({
          date: row.date,
          category: row.category || "OSTATNÍ",
          code: row.code || null,
          description: row.description || null,
          client_name: row.client_name || null,
          amount: row.amount || 0,
          vat_rate: row.vat_rate || 0,
          net_amount: row.net_amount || null,
          payment_method: row.payment_method || null,
          document_type: row.document_type || null,
          document_number: row.document_number || null,
          department: row.department || null,
          source_system: "smartmedix",
          import_batch_id: batch.id,
        }));

        const { error: insertError } = await supabase
          .from("revenue_entries")
          .insert(chunk);

        if (insertError) {
          console.error("Insert error at chunk", i, insertError);
          return NextResponse.json({
            error: `Chyba při vkládání dat (řádek ${i + 1}): ${insertError.message}`,
            count: insertedCount,
          }, { status: 500 });
        }

        insertedCount += chunk.length;
      }

      return NextResponse.json({
        success: true,
        count: insertedCount,
        batch_id: batch.id,
      });
    } catch (err) {
      console.error("Import error:", err);
      return NextResponse.json({ error: "Neočekávaná chyba při importu" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Neplatná akce" }, { status: 400 });
}
