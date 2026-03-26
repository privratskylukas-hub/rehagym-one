// @ts-nocheck
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequirePermission } from "@/components/auth/require-permission";
import { PeriodPicker, useDefaultPeriod } from "@/components/shared/period-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Upload,
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Heart,
  Dumbbell,
  Stethoscope,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

// ── Constants ──────────────────────────────────────────────────

const PAGE_SIZE = 25;

const CATEGORIES = [
  "RESPECT", "BALICEK", "KLUB_SKO", "ZD_STD", "NZD_STD",
  "ZD_SK", "NZD_SK", "OSTATNÍ",
];

const DEPARTMENTS = ["GYM", "REHA", "Re.Life", "PRODUKTY", "Vouchery"];

const PAYMENT_METHODS: Record<string, string> = {
  H: "Hotovost",
  K: "Karta",
  B: "Převod",
};

const fmtCZK = (amount: number) =>
  amount.toLocaleString("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

// ── Component ──────────────────────────────────────────────────

export default function RevenuePage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [period, setPeriod] = useState(useDefaultPeriod("month"));
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Data
  const [entries, setEntries] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    respect: 0,
    gym: 0,
    reha: 0,
    relife: 0,
  });

  // Filters
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [allImportData, setAllImportData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const rangeStart = format(period.start, "yyyy-MM-dd");
    const rangeEnd = format(period.end, "yyyy-MM-dd");

    // Load entries
    let query = supabase
      .from("revenue_entries")
      .select("*", { count: "exact" })
      .gte("date", rangeStart)
      .lte("date", rangeEnd)
      .order("date", { ascending: false });

    if (filterCategory !== "all") query = query.eq("category", filterCategory);
    if (filterDepartment !== "all") query = query.eq("department", filterDepartment);
    if (filterPayment !== "all") query = query.eq("payment_method", filterPayment);
    if (searchQuery) {
      query = query.or(`client_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error loading revenue:", error);
      toast.error("Chyba při načítání tržeb");
    } else {
      setEntries(data || []);
      setTotalCount(count || 0);
    }

    // Load stats
    const { data: allEntries } = await supabase
      .from("revenue_entries")
      .select("amount, category, department")
      .gte("date", rangeStart)
      .lte("date", rangeEnd);

    if (allEntries) {
      setStats({
        total: allEntries.reduce((sum, e) => sum + Number(e.amount), 0),
        respect: allEntries.filter((e) => e.category === "RESPECT").reduce((sum, e) => sum + Number(e.amount), 0),
        gym: allEntries.filter((e) => e.department === "GYM").reduce((sum, e) => sum + Number(e.amount), 0),
        reha: allEntries.filter((e) => e.department === "REHA").reduce((sum, e) => sum + Number(e.amount), 0),
        relife: allEntries.filter((e) => e.department === "Re.Life").reduce((sum, e) => sum + Number(e.amount), 0),
      });
    }

    setLoadingData(false);
  }, [period, filterCategory, filterDepartment, filterPayment, searchQuery, page]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  // ── File import handling ─────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    // Read file and send to server for parsing
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = ev.target?.result;
        if (!data) return;

        // Send raw base64 to API for XLSX parsing
        const base64 = btoa(
          new Uint8Array(data as ArrayBuffer).reduce((str, byte) => str + String.fromCharCode(byte), "")
        );

        const res = await fetch("/api/management/import-revenue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preview", file_data: base64, file_name: file.name }),
        });

        const result = await res.json();
        if (!res.ok) {
          toast.error(result.error || "Chyba při čtení souboru");
          return;
        }

        setPreviewData(result.preview || []);
        setAllImportData(result.rows || []);
        setImportOpen(true);
      } catch (err) {
        console.error("File parse error:", err);
        toast.error("Chyba při zpracování souboru");
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    if (allImportData.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/management/import-revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          rows: allImportData,
          file_name: importFileName,
          imported_by: user?.id,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Chyba při importu");
      } else {
        toast.success(`Import dokončen: ${result.count} záznamů`);
        setImportOpen(false);
        setPreviewData([]);
        setAllImportData([]);
        loadData();
      }
    } catch (err) {
      toast.error("Chyba při importu");
    }
    setImporting(false);
  };

  // ── Pagination ───────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Render ───────────────────────────────────────────────────

  return (
    <RequirePermission permission="management.revenue">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tržby</h1>
            <p className="text-sm text-muted-foreground">
              Detail příjmů dle kategorií a středisek
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4 mr-2" />
              Import XLSX
            </Button>
          </div>
        </div>

        {/* Period picker */}
        <PeriodPicker value={period} onChange={(p) => { setPeriod(p); setPage(0); }} />

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Celkové tržby</CardTitle>
              <div className="rounded-lg p-2 text-lagoon bg-lagoon/10">
                <DollarSign className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCZK(stats.total)}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">RESPECT</CardTitle>
              <div className="rounded-lg p-2 text-orange bg-orange/10">
                <Heart className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCZK(stats.respect)}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">GYM</CardTitle>
              <div className="rounded-lg p-2 text-green-600 bg-green-100 dark:bg-green-900/30">
                <Dumbbell className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCZK(stats.gym)}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">REHA</CardTitle>
              <div className="rounded-lg p-2 text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                <Stethoscope className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCZK(stats.reha)}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Re.Life</CardTitle>
              <div className="rounded-lg p-2 text-purple-600 bg-purple-100 dark:bg-purple-900/30">
                <ShoppingBag className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCZK(stats.relife)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters + Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat klienta, popis..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(0); }}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny KAT</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterDepartment} onValueChange={(v) => { setFilterDepartment(v); setPage(0); }}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Středisko" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechna střediska</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterPayment} onValueChange={(v) => { setFilterPayment(v); setPage(0); }}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Způsob úhr." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny způsoby</SelectItem>
                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {totalCount} záznamů
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Kód</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>DPH</TableHead>
                  <TableHead>Středisko</TableHead>
                  <TableHead>Úhrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <FileSpreadsheet className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {loadingData ? "Načítání..." : "Žádné záznamy v tomto období"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(parseISO(entry.date), "d. M. yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{entry.code || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{entry.description || "—"}</TableCell>
                      <TableCell className="text-sm">{entry.client_name || "—"}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {fmtCZK(Number(entry.amount))}
                      </TableCell>
                      <TableCell className="text-xs">{entry.vat_rate}%</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{entry.department || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {PAYMENT_METHODS[entry.payment_method] || entry.payment_method || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Strana {page + 1} z {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Import Dialog ─────────────────────────────────────── */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Import tržeb z XLSX</DialogTitle>
              <DialogDescription>
                Soubor: {importFileName} | {allImportData.length} řádků nalezeno
              </DialogDescription>
            </DialogHeader>

            {previewData.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Kód</TableHead>
                      <TableHead>Popis</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead className="text-right">Částka</TableHead>
                      <TableHead>Středisko</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{row.date || "—"}</TableCell>
                        <TableCell className="text-xs">{row.category || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{row.code || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{row.description || "—"}</TableCell>
                        <TableCell className="text-xs">{row.client_name || "—"}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {row.amount ? fmtCZK(Number(row.amount)) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{row.department || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {previewData.length < allImportData.length && (
              <p className="text-xs text-muted-foreground">
                Zobrazeno prvních {previewData.length} z {allImportData.length} řádků
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Zrušit
              </Button>
              <Button
                onClick={handleImportConfirm}
                disabled={importing}
                className="bg-lagoon hover:bg-lagoon/90"
              >
                {importing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Importuji...
                  </>
                ) : (
                  <>
                    <Upload className="size-4 mr-2" />
                    Importovat {allImportData.length} záznamů
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
