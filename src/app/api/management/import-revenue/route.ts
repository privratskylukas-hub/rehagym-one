// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

async function authorizeUser(requiredPermission: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Nepřihlášen" }, { status: 401 }), user: null };
  }
  const { data: hasPerm } = await supabase.rpc("has_permission", {
    p_user_id: user.id,
    p_permission_code: requiredPermission,
  });
  if (!hasPerm) {
    return { error: NextResponse.json({ error: "Nedostatečné oprávnění" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

export async function POST(request: NextRequest) {
  const { error: authResponse, user } = await authorizeUser("management.revenue");
  if (authResponse) return authResponse;

  const body = await request.json();
  const { action } = body;

  // ── Preview: parse XLSX and return rows (no DB write, auth-only) ──

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

      const rows = rawRows.map((row) => {
        const mapped: Record<string, any> = {};
        const dateVal = row["DATUM"] || row["Datum"] || row["datum"] || row["date"] || "";
        if (dateVal instanceof Date) {
          mapped.date = dateVal.toISOString().split("T")[0];
        } else if (typeof dateVal === "number") {
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
        mapped.category = row["KAT"] || row["Kategorie"] || row["category"] || "";
        mapped.code = row["KOD"] || row["Kód"] || row["code"] || "";
        mapped.description = row["POPIS"] || row["Popis"] || row["description"] || "";
        mapped.client_name = row["NAZEV"] || row["PLATCE"] || row["Klient"] || row["client_name"] || "";
        const amountVal = row["CELKEM"] || row["Částka"] || row["amount"] || 0;
        mapped.amount = typeof amountVal === "number" ? amountVal : parseFloat(String(amountVal).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
        mapped.vat_rate = parseInt(row["DPH"] || row["dph"] || "0") || 0;
        const netVal = row["VYNOS"] || row["Bez DPH"] || null;
        mapped.net_amount = netVal != null ? (typeof netVal === "number" ? netVal : parseFloat(String(netVal).replace(/[^\d.,-]/g, "").replace(",", ".")) || null) : null;
        mapped.payment_method = row["ZPUSUHR"] || row["Způsob"] || "";
        mapped.document_type = row["TYPDOKL"] || row["Typ dok."] || "";
        mapped.document_number = row["CISDOKL"] || row["Č. dok."] || "";
        mapped.department = row["Středisko"] || row["stredisko"] || row["department"] || "";
        mapped.source_system = "smartmedix";
        return mapped;
      }).filter((row) => row.date && row.amount);

      return NextResponse.json({ preview: rows.slice(0, 10), rows, total: rows.length });
    } catch (err) {
      console.error("XLSX parse error:", err);
      return NextResponse.json({ error: "Chyba při zpracování souboru" }, { status: 500 });
    }
  }

  // ── Import: save rows to database (uses admin client for RLS bypass) ──

  if (action === "import") {
    try {
      const { rows, file_name } = body;
      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "Žádná data k importu" }, { status: 400 });
      }

      const admin = createAdminClient();
      const dates = rows.map((r: any) => r.date).filter(Boolean).sort();

      const { data: batch, error: batchError } = await admin
        .from("import_batches")
        .insert({
          type: "revenue",
          source_system: "smartmedix",
          file_name: file_name || "unknown.xlsx",
          row_count: rows.length,
          period_from: dates[0] || null,
          period_to: dates[dates.length - 1] || null,
          imported_by: user!.id,
        })
        .select("id")
        .single();

      if (batchError) {
        console.error("Batch insert error:", batchError);
        return NextResponse.json({ error: "Chyba při vytváření importu" }, { status: 500 });
      }

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

        const { error: insertError } = await admin.from("revenue_entries").insert(chunk);
        if (insertError) {
          console.error("Insert error at chunk", i, insertError);
          return NextResponse.json({
            error: `Chyba při vkládání dat (řádek ${i + 1}): ${insertError.message}`,
            count: insertedCount,
          }, { status: 500 });
        }
        insertedCount += chunk.length;
      }

      return NextResponse.json({ success: true, count: insertedCount, batch_id: batch.id });
    } catch (err) {
      console.error("Import error:", err);
      return NextResponse.json({ error: "Neočekávaná chyba při importu" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Neplatná akce" }, { status: 400 });
}
