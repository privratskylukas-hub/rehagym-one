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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Search,
  Upload,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Building,
  Zap,
  Wallet,
  Wrench,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

// ── Constants ──────────────────────────────────────────────────

const PAGE_SIZE = 25;

const COST_CATEGORIES = [
  "FIXNÍ", "MATERIÁL", "SLUŽBY", "MAJETEK", "MARKETING", "ODPISY",
  "GYM", "REHA", "Re.Life", "MZDY",
];

const DEPARTMENTS = ["REHAGYM", "FITNESS", "MANAGEMENT", "ORDINACE", "RECEPCE"];

const FIXED_COST_CATEGORIES: Record<string, string> = {
  rent: "Nájem",
  energy: "Energie",
  salaries: "Mzdy",
  software: "Software",
  insurance: "Pojištění",
  other: "Ostatní",
};

// Czech labels for variable Karát cost categories
const COST_CATEGORY_LABELS: Record<string, string> = {
  "FIXNÍ": "Fixní náklady",
  "MATERIÁL": "Materiál",
  "SLUŽBY": "Služby",
  "MAJETEK": "Majetek",
  "MARKETING": "Marketing",
  "ODPISY": "Odpisy",
  GYM: "Fitness (GYM)",
  REHA: "Rehabilitace",
  "Re.Life": "Re.Life",
  "MZDY": "Mzdy",
};
const labelCostCategory = (c?: string | null) =>
  !c ? "—" : COST_CATEGORY_LABELS[c] || c;

// Czech labels for departments
const DEPARTMENT_LABELS: Record<string, string> = {
  REHAGYM: "RehaGym",
  FITNESS: "Fitness",
  MANAGEMENT: "Vedení",
  ORDINACE: "Ordinace",
  RECEPCE: "Recepce",
  GYM: "Fitness (GYM)",
  REHA: "Rehabilitace",
  "Re.Life": "Re.Life",
};
const labelDepartment = (d?: string | null) =>
  !d ? "—" : DEPARTMENT_LABELS[d] || d;

const fmtCZK = (amount: number) =>
  amount.toLocaleString("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

// ── Component ──────────────────────────────────────────────────

export default function CostsPage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [period, setPeriod] = useState(useDefaultPeriod("month"));
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"entries" | "fixed">("entries");

  // Data
  const [entries, setEntries] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    fixni: 0,
    material: 0,
    sluzby: 0,
    mzdy: 0,
  });

  // Filters
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterAccount, setFilterAccount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [allImportData, setAllImportData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fixed costs
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [fixedDialogOpen, setFixedDialogOpen] = useState(false);
  const [editingFixed, setEditingFixed] = useState<any>(null);
  const [fixedForm, setFixedForm] = useState({
    name: "",
    category: "rent",
    default_amount: "",
    notes: "",
  });
  const [savingFixed, setSavingFixed] = useState(false);

  // ── Load data ────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const rangeStart = format(period.start, "yyyy-MM-dd");
    const rangeEnd = format(period.end, "yyyy-MM-dd");

    // Load entries
    let query = supabase
      .from("cost_entries")
      .select("*", { count: "exact" })
      .gte("date", rangeStart)
      .lte("date", rangeEnd)
      .order("date", { ascending: false });

    if (filterCategory !== "all") query = query.eq("category", filterCategory);
    if (filterDepartment !== "all") query = query.eq("department", filterDepartment);
    if (filterAccount) query = query.ilike("account_code", `%${filterAccount}%`);
    if (searchQuery) {
      query = query.or(`description.ilike.%${searchQuery}%,note.ilike.%${searchQuery}%`);
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error loading costs:", error);
      toast.error("Chyba při načítání nákladů");
    } else {
      setEntries(data || []);
      setTotalCount(count || 0);
    }

    // Load stats
    const { data: allEntries } = await supabase
      .from("cost_entries")
      .select("amount, category")
      .gte("date", rangeStart)
      .lte("date", rangeEnd);

    if (allEntries) {
      setStats({
        total: allEntries.reduce((sum, e) => sum + Number(e.amount), 0),
        fixni: allEntries.filter((e) => e.category === "FIXNÍ").reduce((sum, e) => sum + Number(e.amount), 0),
        material: allEntries.filter((e) => e.category === "MATERIÁL").reduce((sum, e) => sum + Number(e.amount), 0),
        sluzby: allEntries.filter((e) => e.category === "SLUŽBY").reduce((sum, e) => sum + Number(e.amount), 0),
        mzdy: allEntries.filter((e) => e.category === "MZDY").reduce((sum, e) => sum + Number(e.amount), 0),
      });
    }

    setLoadingData(false);
  }, [period, filterCategory, filterDepartment, filterAccount, searchQuery, page]);

  const loadFixedCosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("fixed_monthly_costs")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      console.error("Error loading fixed costs:", error);
    } else {
      setFixedCosts(data || []);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadData();
      loadFixedCosts();
    }
  }, [authLoading, loadData, loadFixedCosts]);

  // ── File import ──────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = ev.target?.result;
        if (!data) return;

        const base64 = btoa(
          new Uint8Array(data as ArrayBuffer).reduce((str, byte) => str + String.fromCharCode(byte), "")
        );

        const res = await fetch("/api/management/import-costs", {
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

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    if (allImportData.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/management/import-costs", {
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

  // ── Fixed costs CRUD ─────────────────────────────────────────

  const resetFixedForm = () => {
    setFixedForm({ name: "", category: "rent", default_amount: "", notes: "" });
    setEditingFixed(null);
  };

  const handleSaveFixed = async () => {
    if (!fixedForm.name || !fixedForm.default_amount) {
      toast.error("Vyplňte název a částku");
      return;
    }

    setSavingFixed(true);
    const payload = {
      name: fixedForm.name,
      category: fixedForm.category,
      default_amount: parseFloat(fixedForm.default_amount) || 0,
      notes: fixedForm.notes || null,
    };

    if (editingFixed) {
      const { error } = await supabase
        .from("fixed_monthly_costs")
        .update(payload)
        .eq("id", editingFixed.id);

      if (error) {
        toast.error("Chyba při ukládání");
      } else {
        toast.success("Fixní náklad upraven");
        setFixedDialogOpen(false);
        resetFixedForm();
        loadFixedCosts();
      }
    } else {
      const { error } = await supabase
        .from("fixed_monthly_costs")
        .insert({ ...payload, is_active: true });

      if (error) {
        toast.error("Chyba při ukládání");
      } else {
        toast.success("Fixní náklad přidán");
        setFixedDialogOpen(false);
        resetFixedForm();
        loadFixedCosts();
      }
    }
    setSavingFixed(false);
  };

  const handleEditFixed = (item: any) => {
    setEditingFixed(item);
    setFixedForm({
      name: item.name,
      category: item.category,
      default_amount: String(item.default_amount),
      notes: item.notes || "",
    });
    setFixedDialogOpen(true);
  };

  const handleDeleteFixed = async (id: string) => {
    const { error } = await supabase
      .from("fixed_monthly_costs")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Chyba při mazání");
    } else {
      toast.success("Fixní náklad smazán");
      loadFixedCosts();
    }
  };

  const handleToggleFixed = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("fixed_monthly_costs")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast.error("Chyba při změně stavu");
    } else {
      loadFixedCosts();
    }
  };

  // ── Pagination ───────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const fixedTotal = fixedCosts.filter((c) => c.is_active).reduce((sum, c) => sum + Number(c.default_amount), 0);

  // ── Render ───────────────────────────────────────────────────

  return (
    <RequirePermission permission="management.costs">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Náklady</h1>
            <p className="text-sm text-muted-foreground">
              Detail nákladů a fixních měsíčních výdajů
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

        {/* Tab buttons */}
        <div className="flex items-center gap-2 border-b pb-2">
          <Button
            variant={activeTab === "entries" ? "default" : "ghost"}
            size="sm"
            className={activeTab === "entries" ? "bg-lagoon hover:bg-lagoon/90" : ""}
            onClick={() => setActiveTab("entries")}
          >
            Nákladové položky
          </Button>
          <Button
            variant={activeTab === "fixed" ? "default" : "ghost"}
            size="sm"
            className={activeTab === "fixed" ? "bg-lagoon hover:bg-lagoon/90" : ""}
            onClick={() => setActiveTab("fixed")}
          >
            Fixní měsíční náklady
          </Button>
        </div>

        {/* ── Cost entries tab ─────────────────────────────────── */}
        {activeTab === "entries" && (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Celkové náklady</CardTitle>
                  <div className="rounded-lg p-2 text-red-500 bg-red-100 dark:bg-red-900/30">
                    <TrendingDown className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtCZK(stats.total)}</div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">FIXNÍ</CardTitle>
                  <div className="rounded-lg p-2 text-lagoon bg-lagoon/10">
                    <Building className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtCZK(stats.fixni)}</div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">MATERIÁL</CardTitle>
                  <div className="rounded-lg p-2 text-orange bg-orange/10">
                    <Wrench className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtCZK(stats.material)}</div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">SLUŽBY</CardTitle>
                  <div className="rounded-lg p-2 text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                    <Briefcase className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtCZK(stats.sluzby)}</div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">MZDY</CardTitle>
                  <div className="rounded-lg p-2 text-green-600 bg-green-100 dark:bg-green-900/30">
                    <Wallet className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtCZK(stats.mzdy)}</div>
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
                      placeholder="Hledat popis, poznámku..."
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
                        {COST_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterDepartment} onValueChange={(v) => { setFilterDepartment(v); setPage(0); }}>
                      <SelectTrigger className="w-[140px] h-9 text-xs">
                        <SelectValue placeholder="Oddělení" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Všechna oddělení</SelectItem>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Účet (501/...)"
                      value={filterAccount}
                      onChange={(e) => { setFilterAccount(e.target.value); setPage(0); }}
                      className="w-[120px] h-9 text-xs"
                    />

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
                      <TableHead>Období</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Účet</TableHead>
                      <TableHead>Popis</TableHead>
                      <TableHead className="text-right">MD</TableHead>
                      <TableHead className="text-right">D</TableHead>
                      <TableHead className="text-right">Obrat</TableHead>
                      <TableHead>Oddělení</TableHead>
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
                          <TableCell className="text-xs text-muted-foreground">{entry.accounting_period || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{labelCostCategory(entry.category)}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{entry.account_code || "—"}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {entry.description || "—"}
                            {entry.note && (
                              <p className="text-xs text-muted-foreground truncate">{entry.note}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{entry.debit ? fmtCZK(Number(entry.debit)) : "—"}</TableCell>
                          <TableCell className="text-right text-sm">{entry.credit ? fmtCZK(Number(entry.credit)) : "—"}</TableCell>
                          <TableCell className="text-right font-semibold whitespace-nowrap">
                            {fmtCZK(Number(entry.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{labelDepartment(entry.department)}</Badge>
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
          </>
        )}

        {/* ── Fixed costs tab ──────────────────────────────────── */}
        {activeTab === "fixed" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Fixní měsíční náklady</CardTitle>
                <CardDescription>
                  Celkem aktivní: {fmtCZK(fixedTotal)} / měsíc
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-lagoon hover:bg-lagoon/90"
                onClick={() => { resetFixedForm(); setFixedDialogOpen(true); }}
              >
                <Plus className="size-4 mr-2" />
                Přidat
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Název</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="text-right">Měsíční částka</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Poznámka</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedCosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Žádné fixní náklady
                      </TableCell>
                    </TableRow>
                  ) : (
                    fixedCosts.map((item) => (
                      <TableRow key={item.id} className={`hover:bg-muted/50 ${!item.is_active ? "opacity-50" : ""}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {FIXED_COST_CATEGORIES[item.category] || item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmtCZK(Number(item.default_amount))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.is_active ? "default" : "secondary"}
                            className="text-xs cursor-pointer"
                            onClick={() => handleToggleFixed(item.id, item.is_active)}
                          >
                            {item.is_active ? "Aktivní" : "Neaktivní"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {item.notes || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditFixed(item)}>
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => handleDeleteFixed(item.id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Import Dialog ─────────────────────────────────────── */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Import nákladů z XLSX</DialogTitle>
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
                      <TableHead>Účet</TableHead>
                      <TableHead>Popis</TableHead>
                      <TableHead className="text-right">Obrat</TableHead>
                      <TableHead>Oddělení</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{row.date || "—"}</TableCell>
                        <TableCell className="text-xs">{labelCostCategory(row.category)}</TableCell>
                        <TableCell className="text-xs font-mono">{row.account_code || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{row.description || "—"}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {row.amount ? fmtCZK(Number(row.amount)) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{labelDepartment(row.department)}</TableCell>
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

        {/* ── Fixed Cost Dialog ──────────────────────────────────── */}
        <Dialog open={fixedDialogOpen} onOpenChange={(o) => { if (!o) { setFixedDialogOpen(false); resetFixedForm(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingFixed ? "Upravit fixní náklad" : "Nový fixní náklad"}</DialogTitle>
              <DialogDescription>Pravidelný měsíční výdaj</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Název *</Label>
                <Input
                  placeholder="Např. Nájem prostory"
                  value={fixedForm.name}
                  onChange={(e) => setFixedForm({ ...fixedForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Kategorie *</Label>
                <Select value={fixedForm.category} onValueChange={(v) => setFixedForm({ ...fixedForm, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIXED_COST_CATEGORIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Měsíční částka (Kč) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  value={fixedForm.default_amount}
                  onChange={(e) => setFixedForm({ ...fixedForm, default_amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Poznámka</Label>
                <Input
                  placeholder="Interní poznámka..."
                  value={fixedForm.notes}
                  onChange={(e) => setFixedForm({ ...fixedForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setFixedDialogOpen(false); resetFixedForm(); }}>
                Zrušit
              </Button>
              <Button onClick={handleSaveFixed} disabled={savingFixed} className="bg-lagoon hover:bg-lagoon/90">
                {savingFixed ? "Ukládám..." : editingFixed ? "Uložit změny" : "Přidat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
