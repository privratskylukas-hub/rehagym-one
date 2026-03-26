// @ts-nocheck
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Stethoscope,
  FileText,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────

interface MedicalRecord {
  id: string;
  client_id: string;
  provider_id: string | null;
  type: string;
  title: string;
  content: string;
  diagnosis_codes: string[] | null;
  procedures: string[] | null;
  treatment_plan: string | null;
  recommended_sessions: number | null;
  session_frequency: string | null;
  is_confidential: boolean;
  created_at: string;
  updated_at: string;
  client?: { id: string; first_name: string; last_name: string } | null;
  provider?: { id: string; full_name: string } | null;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface Provider {
  id: string;
  full_name: string;
}

// ── Constants ──────────────────────────────────────────────────

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  initial_exam: { label: "Vstupní vyšetření", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  follow_up: { label: "Kontrolní vyšetření", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  diagnosis: { label: "Diagnóza", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  treatment: { label: "Léčba / Terapie", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  discharge: { label: "Závěrečná zpráva", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
  note: { label: "Poznámka", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  anamnesis: { label: "Anamnéza", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
};

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────

export default function MedicalRecordsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading, hasPermission } = useAuth();

  // Data
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Client search
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form
  const [form, setForm] = useState({
    client_id: "",
    provider_id: "",
    type: "initial_exam",
    title: "",
    content: "",
    diagnosis_codes: "",
    procedures: "",
    treatment_plan: "",
    recommended_sessions: "",
    session_frequency: "",
    is_confidential: false,
  });

  // ── Load data ────────────────────────────────────────────────

  const loadProviders = useCallback(async () => {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    if (data) setProviders(data);
  }, []);

  const loadRecords = useCallback(async () => {
    setLoadingData(true);

    let query = supabase
      .from("medical_records")
      .select(`
        *,
        client:clients(id, first_name, last_name),
        provider:users!medical_records_provider_id_fkey(id, full_name)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (filterType !== "all") query = query.eq("type", filterType);

    // Only show own records if no read_all permission
    if (!hasPermission("medical.read_all") && hasPermission("medical.read_own") && user) {
      query = query.eq("provider_id", user.id);
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error loading records:", error);
      toast.error("Chyba při načítání záznamů");
    } else {
      let filtered = data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.client?.first_name?.toLowerCase().includes(q) ||
            r.client?.last_name?.toLowerCase().includes(q) ||
            r.title?.toLowerCase().includes(q)
        );
      }
      setRecords(filtered);
      setTotalCount(count || 0);
    }
    setLoadingData(false);
  }, [filterType, searchQuery, page, user]);

  useEffect(() => { loadProviders(); }, [loadProviders]);
  useEffect(() => { if (!authLoading) loadRecords(); }, [authLoading, loadRecords]);

  // ── Client search ────────────────────────────────────────────

  const searchClients = useCallback(async (q: string) => {
    if (q.length < 2) { setClientResults([]); return; }
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);
    setClientResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientSearch), 300);
    return () => clearTimeout(timer);
  }, [clientSearch, searchClients]);

  // ── Form helpers ─────────────────────────────────────────────

  const resetForm = () => {
    setForm({
      client_id: "",
      provider_id: user?.id || "",
      type: "initial_exam",
      title: "",
      content: "",
      diagnosis_codes: "",
      procedures: "",
      treatment_plan: "",
      recommended_sessions: "",
      session_frequency: "",
      is_confidential: false,
    });
    setSelectedClient(null);
    setClientSearch("");
    setClientResults([]);
    setEditingRecord(null);
  };

  const openEditDialog = (record: MedicalRecord) => {
    setEditingRecord(record);
    setForm({
      client_id: record.client_id,
      provider_id: record.provider_id || "",
      type: record.type,
      title: record.title,
      content: record.content,
      diagnosis_codes: record.diagnosis_codes?.join(", ") || "",
      procedures: record.procedures?.join(", ") || "",
      treatment_plan: record.treatment_plan || "",
      recommended_sessions: record.recommended_sessions?.toString() || "",
      session_frequency: record.session_frequency || "",
      is_confidential: record.is_confidential,
    });
    if (record.client) {
      setSelectedClient({
        id: record.client.id,
        first_name: record.client.first_name,
        last_name: record.client.last_name,
        email: null,
      });
    }
    setDialogOpen(true);
  };

  // ── Save ─────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.client_id) { toast.error("Vyberte klienta"); return; }
    if (!form.title) { toast.error("Vyplňte název záznamu"); return; }
    if (!form.content) { toast.error("Vyplňte obsah záznamu"); return; }

    setSaving(true);

    const payload = {
      client_id: form.client_id,
      provider_id: form.provider_id || null,
      type: form.type,
      title: form.title,
      content: form.content,
      diagnosis_codes: form.diagnosis_codes ? form.diagnosis_codes.split(",").map((s) => s.trim()).filter(Boolean) : null,
      procedures: form.procedures ? form.procedures.split(",").map((s) => s.trim()).filter(Boolean) : null,
      treatment_plan: form.treatment_plan || null,
      recommended_sessions: form.recommended_sessions ? parseInt(form.recommended_sessions) : null,
      session_frequency: form.session_frequency || null,
      is_confidential: form.is_confidential,
    };

    let error;
    if (editingRecord) {
      const res = await supabase.from("medical_records").update(payload).eq("id", editingRecord.id);
      error = res.error;
    } else {
      const res = await supabase.from("medical_records").insert(payload);
      error = res.error;
    }

    if (error) {
      console.error("Error saving record:", error);
      toast.error("Chyba při ukládání záznamu");
    } else {
      toast.success(editingRecord ? "Záznam aktualizován" : "Záznam vytvořen");
      setDialogOpen(false);
      resetForm();
      loadRecords();
    }
    setSaving(false);
  };

  // ── Delete ───────────────────────────────────────────────────

  const handleDelete = async (record: MedicalRecord) => {
    if (!confirm("Opravdu chcete smazat tento záznam?")) return;
    const { error } = await supabase.from("medical_records").delete().eq("id", record.id);
    if (error) {
      toast.error("Chyba při mazání");
    } else {
      toast.success("Záznam smazán");
      loadRecords();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Render ───────────────────────────────────────────────────

  return (
    <RequirePermission permissions={["medical.read_own", "medical.read_all"]}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Zdravotní záznamy</h1>
            <p className="text-sm text-muted-foreground">
              Vyšetření, diagnózy a léčebné plány
            </p>
          </div>
          {hasPermission("medical.write") && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-lagoon hover:bg-lagoon/90">
              <Plus className="size-4 mr-2" />
              Nový záznam
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat klienta, název..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Typ záznamu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny typy</SelectItem>
                  {Object.entries(TYPE_MAP).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-xs self-center">
                {totalCount} záznamů
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Název</TableHead>
                  <TableHead>Lékař / Terapeut</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Stethoscope className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {loadingData ? "Načítání..." : "Žádné zdravotní záznamy"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="text-sm font-medium">
                          {format(parseISO(record.created_at), "d. M. yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(record.created_at), "H:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.client ? (
                          <span
                            className="font-medium cursor-pointer hover:text-lagoon"
                            onClick={() => router.push(`/clients/${record.client!.id}`)}
                          >
                            {record.client.first_name} {record.client.last_name}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${TYPE_MAP[record.type]?.color || ""}`}>
                          {TYPE_MAP[record.type]?.label || record.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.is_confidential && <Lock className="size-3 text-orange" />}
                          <span className="font-medium text-sm">{record.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{record.provider?.full_name || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setViewingRecord(record); setViewDialogOpen(true); }}
                          >
                            <Eye className="size-3 mr-1" />
                            Zobrazit
                          </Button>
                          {hasPermission("medical.write") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => openEditDialog(record)}
                            >
                              Upravit
                            </Button>
                          )}
                          {hasPermission("medical.write") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive"
                              onClick={() => handleDelete(record)}
                            >
                              Smazat
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">Strana {page + 1} z {totalPages}</span>
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

        {/* ── VIEW DIALOG ───────────────────────────────────── */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {viewingRecord && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <DialogTitle>{viewingRecord.title}</DialogTitle>
                    {viewingRecord.is_confidential && (
                      <Badge variant="outline" className="text-orange border-orange">
                        <Lock className="size-3 mr-1" />
                        Důvěrné
                      </Badge>
                    )}
                  </div>
                  <DialogDescription>
                    <Badge variant="outline" className={TYPE_MAP[viewingRecord.type]?.color || ""}>
                      {TYPE_MAP[viewingRecord.type]?.label || viewingRecord.type}
                    </Badge>
                    {" • "}
                    {format(parseISO(viewingRecord.created_at), "d. MMMM yyyy H:mm", { locale: cs })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Klient</span>
                      <p className="font-medium">
                        {viewingRecord.client
                          ? `${viewingRecord.client.first_name} ${viewingRecord.client.last_name}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Lékař / Terapeut</span>
                      <p className="font-medium">{viewingRecord.provider?.full_name || "—"}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Obsah</span>
                    <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                      {viewingRecord.content}
                    </div>
                  </div>

                  {viewingRecord.diagnosis_codes && viewingRecord.diagnosis_codes.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Diagnózy (MKN-10)</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {viewingRecord.diagnosis_codes.map((code, i) => (
                          <Badge key={i} variant="secondary">{code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingRecord.procedures && viewingRecord.procedures.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Výkony</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {viewingRecord.procedures.map((proc, i) => (
                          <Badge key={i} variant="outline">{proc}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingRecord.treatment_plan && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Léčebný plán</span>
                      <div className="mt-1 p-3 bg-lagoon/5 border border-lagoon/20 rounded-lg text-sm whitespace-pre-wrap">
                        {viewingRecord.treatment_plan}
                      </div>
                    </div>
                  )}

                  {(viewingRecord.recommended_sessions || viewingRecord.session_frequency) && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {viewingRecord.recommended_sessions && (
                        <div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Doporučený počet návštěv</span>
                          <p className="font-medium">{viewingRecord.recommended_sessions}×</p>
                        </div>
                      )}
                      {viewingRecord.session_frequency && (
                        <div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Frekvence</span>
                          <p className="font-medium">{viewingRecord.session_frequency}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ── CREATE/EDIT DIALOG ────────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? "Upravit záznam" : "Nový zdravotní záznam"}</DialogTitle>
              <DialogDescription>
                {editingRecord ? "Upravte údaje záznamu" : "Vyplňte údaje zdravotního záznamu"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Client */}
              <div className="space-y-2">
                <Label>Klient *</Label>
                {selectedClient ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <User className="size-4 text-muted-foreground" />
                    <span className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0"
                      onClick={() => { setSelectedClient(null); setForm({ ...form, client_id: "" }); }}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Hledat klienta..." value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)} className="pl-9" />
                    {clientResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {clientResults.map((c) => (
                          <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => { setSelectedClient(c); setForm({ ...form, client_id: c.id }); setClientSearch(""); setClientResults([]); }}>
                            <span className="font-medium">{c.first_name} {c.last_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Type & Provider */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Typ záznamu *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_MAP).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lékař / Terapeut</Label>
                  <Select value={form.provider_id} onValueChange={(v) => setForm({ ...form, provider_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label>Název záznamu *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Např. Vstupní vyšetření — bolest bederní páteře" />
              </div>

              {/* Content */}
              <div>
                <Label>Obsah záznamu *</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={6} placeholder="Popište nález, vyšetření, doporučení..." />
              </div>

              {/* Diagnosis & Procedures */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kódy diagnóz (MKN-10)</Label>
                  <Input value={form.diagnosis_codes} onChange={(e) => setForm({ ...form, diagnosis_codes: e.target.value })}
                    placeholder="M54.5, G43.0" />
                  <p className="text-[10px] text-muted-foreground mt-1">Oddělujte čárkou</p>
                </div>
                <div>
                  <Label>Výkony</Label>
                  <Input value={form.procedures} onChange={(e) => setForm({ ...form, procedures: e.target.value })}
                    placeholder="Elektroterapie, Ultrazvuk" />
                  <p className="text-[10px] text-muted-foreground mt-1">Oddělujte čárkou</p>
                </div>
              </div>

              {/* Treatment plan */}
              <div>
                <Label>Léčebný plán</Label>
                <Textarea value={form.treatment_plan} onChange={(e) => setForm({ ...form, treatment_plan: e.target.value })}
                  rows={3} placeholder="Doporučený postup léčby..." />
              </div>

              {/* Sessions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Doporučený počet návštěv</Label>
                  <Input type="number" min="1" value={form.recommended_sessions}
                    onChange={(e) => setForm({ ...form, recommended_sessions: e.target.value })} placeholder="10" />
                </div>
                <div>
                  <Label>Frekvence návštěv</Label>
                  <Input value={form.session_frequency}
                    onChange={(e) => setForm({ ...form, session_frequency: e.target.value })} placeholder="2× týdně" />
                </div>
              </div>

              {/* Confidential */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="confidential"
                  checked={form.is_confidential}
                  onCheckedChange={(checked) => setForm({ ...form, is_confidential: !!checked })}
                />
                <Label htmlFor="confidential" className="flex items-center gap-1 cursor-pointer">
                  <Lock className="size-3 text-orange" />
                  Důvěrný záznam (viditelný pouze pro oprávněné uživatele)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-lagoon hover:bg-lagoon/90">
                {saving ? "Ukládám..." : editingRecord ? "Uložit změny" : "Vytvořit záznam"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
