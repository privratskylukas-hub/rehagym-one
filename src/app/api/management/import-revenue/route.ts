// @ts-nocheck — Supabase types will be auto-generated once connected
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

      // Map columns — SmartMedix trzby.xlsx format:
      // DATUM, KAT, KOD, POPIS, NAZEV, CELKEM, DPH, TYPDOKL, CISDOKL, VYNOS, PLATCE, PLATCEIDENT, DATVYST, ZPUSUHR, Středisko
      const rows = rawRows.map((row) => {
        const mapped: Record<string, any> = {};

        // Date — DATUM column (Excel Date object or string)
        const dateVal = row["DATUM"] || row["Datum"] || row["datum"] || row["date"] || "";
        if (dateVal instanceof Date) {
          mapped.date = dateVal.toISOString().split("T")[0];
        } else if (typeof dateVal === "number") {
          // Excel serial date number
          const d = new Date((dateVal - 25569) * 86400 * 1000);
          mapped.date = d.toISOString().split("T")[0];
        } else if (typeof dateVal === "string" && dateVal) {
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

        // Category — KAT column (RESPECT, BALICEK, SUPLMNT, etc.)
        mapped.category = row["KAT"] || row["Kategorie"] || row["category"] || "";
        // Code — KOD column (RES_IDV, PROT_COK, etc.)
        mapped.code = row["KOD"] || row["Kód"] || row["code"] || "";
        // Description — POPIS column
        mapped.description = row["POPIS"] || row["Popis"] || row["description"] || "";
        // Client name — NAZEV or PLATCE column
        mapped.client_name = row["NAZEV"] || row["PLATCE"] || row["Klient"] || row["client_name"] || "";
        // Amount — CELKEM column (total including VAT)
        const amountVal = row["CELKEM"] || row["Částka"] || row["amount"] || 0;
        mapped.amount = typeof amountVal === "number" ? amountVal : parseFloat(String(amountVal).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
        // VAT rate — DPH column
        mapped.vat_rate = parseInt(row["DPH"] || row["dph"] || "0") || 0;
        // Net amount — VYNOS column (revenue without VAT)
        const netVal = row["VYNOS"] || row["Bez DPH"] || null;
        mapped.net_amount = netVal != null ? (typeof netVal === "number" ? netVal : parseFloat(String(netVal).replace(/[^\d.,-]/g, "").replace(",", ".")) || null) : null;
        // Payment method — ZPUSUHR column (H=cash, K=card, B=transfer)
        mapped.payment_method = row["ZPUSUHR"] || row["Způsob"] || "";
        // Document type — TYPDOKL column (D, F, O)
        mapped.document_type = row["TYPDOKL"] || row["Typ dok."] || "";
        // Document number — CISDOKL column
        mapped.document_number = row["CISDOKL"] || row["Č. dok."] || "";
        // Department — Středisko column (GYM, REHA, PRODUKTY, etc.)
        mapped.department = row["Středisko"] || row["stredisko"] || row["department"] || "";
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
