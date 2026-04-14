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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, Heart, User, X, ChevronLeft, ChevronRight, Activity, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────

interface TrainingPlan {
  id: string;
  client_id: string;
  trainer_id: string | null;
  name: string;
  description: string | null;
  goals: string | null;
  start_date: string | null;
  end_date: string | null;
  frequency: string | null;
  is_active: boolean;
  created_at: string;
  client?: { id: string; first_name: string; last_name: string } | null;
  trainer?: { id: string; full_name: string } | null;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Provider {
  id: string;
  full_name: string;
}

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────

export default function PhysioPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading, hasPermission, hasAnyPermission } = useAuth();

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(0);
  const [filterActive, setFilterActive] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    trainer_id: "",
    name: "",
    description: "",
    goals: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    frequency: "",
    is_active: true,
  });

  // ── Load data ────────────────────────────────────────────────

  const loadProviders = useCallback(async () => {
    const { data } = await supabase.from("users").select("id, full_name").eq("status", "active").order("full_name");
    if (data) setProviders(data);
  }, []);

  const loadPlans = useCallback(async () => {
    setLoadingData(true);

    let query = supabase
      .from("training_plans")
      .select(`
        *,
        client:clients(id, first_name, last_name),
        trainer:users!training_plans_trainer_id_fkey(id, full_name)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (filterActive === "active") query = query.eq("is_active", true);
    else if (filterActive === "inactive") query = query.eq("is_active", false);

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error loading plans:", error);
      toast.error("Chyba při načítání plánů");
    } else {
      let filtered = data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.client?.first_name?.toLowerCase().includes(q) ||
            p.client?.last_name?.toLowerCase().includes(q) ||
            p.name?.toLowerCase().includes(q)
        );
      }
      setPlans(filtered);
      setTotalCount(count || 0);
    }
    setLoadingData(false);
  }, [filterActive, searchQuery, page]);

  useEffect(() => { loadProviders(); }, [loadProviders]);
  useEffect(() => { if (!authLoading) loadPlans(); }, [authLoading, loadPlans]);

  // ── Client search ────────────────────────────────────────────

  const searchClients = useCallback(async (q: string) => {
    if (q.length < 2) { setClientResults([]); return; }
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
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
      client_id: "", trainer_id: user?.id || "", name: "", description: "",
      goals: "", start_date: format(new Date(), "yyyy-MM-dd"), end_date: "",
      frequency: "", is_active: true,
    });
    setSelectedClient(null);
    setClientSearch("");
    setEditingPlan(null);
  };

  const openEditDialog = (plan: TrainingPlan) => {
    setEditingPlan(plan);
    setForm({
      client_id: plan.client_id,
      trainer_id: plan.trainer_id || "",
      name: plan.name,
      description: plan.description || "",
      goals: plan.goals || "",
      start_date: plan.start_date || "",
      end_date: plan.end_date || "",
      frequency: plan.frequency || "",
      is_active: plan.is_active,
    });
    if (plan.client) setSelectedClient({ id: plan.client.id, first_name: plan.client.first_name, last_name: plan.client.last_name });
    setDialogOpen(true);
  };

  // ── Save ─────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.client_id) { toast.error("Vyberte klienta"); return; }
    if (!form.name) { toast.error("Vyplňte název plánu"); return; }

    // RLS requires trainer_id = auth.uid() for training.write_own.
    const effectiveTrainerId = form.trainer_id || user?.id || null;
    if (!effectiveTrainerId) {
      toast.error("Chybí trenér");
      return;
    }

    setSaving(true);
    const payload = {
      client_id: form.client_id,
      trainer_id: effectiveTrainerId,
      name: form.name,
      description: form.description || null,
      goals: form.goals || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      frequency: form.frequency || null,
      is_active: form.is_active,
    };

    let error;
    if (editingPlan) {
      const res = await supabase.from("training_plans").update(payload).eq("id", editingPlan.id);
      error = res.error;
    } else {
      const res = await supabase.from("training_plans").insert(payload);
      error = res.error;
    }

    if (error) {
      const msg = error.message?.includes("row-level security")
        ? "Nemáte oprávnění zapsat tento plán."
        : `Chyba při ukládání: ${error.message}`;
      toast.error(msg);
    } else {
      toast.success(editingPlan ? "Plán aktualizován" : "Plán vytvořen");
      setDialogOpen(false);
      resetForm();
      loadPlans();
    }
    setSaving(false);
  };

  const toggleActive = async (plan: TrainingPlan) => {
    const { error } = await supabase
      .from("training_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);
    if (error) toast.error("Chyba"); else { toast.success(plan.is_active ? "Plán deaktivován" : "Plán aktivován"); loadPlans(); }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <RequirePermission permissions={["training.read_own", "training.read_all"]}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fyzioterapie</h1>
            <p className="text-sm text-muted-foreground">Rehabilitační a tréninkové plány</p>
          </div>
          {hasAnyPermission(["training.write_own", "training.write_all"]) && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-lagoon hover:bg-lagoon/90">
              <Plus className="size-4 mr-2" />
              Nový plán
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Hledat klienta, plán..." value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} className="pl-9 h-9" />
              </div>
              <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setPage(0); }}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem value="active">Aktivní</SelectItem>
                  <SelectItem value="inactive">Neaktivní</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-xs self-center">{totalCount} plánů</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klient</TableHead>
                  <TableHead>Plán</TableHead>
                  <TableHead>Terapeut</TableHead>
                  <TableHead>Období</TableHead>
                  <TableHead>Frekvence</TableHead>
                  <TableHead>Stav</TableHead>
                  {hasAnyPermission(["training.write_own", "training.write_all"]) && <TableHead className="text-right">Akce</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Heart className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {loadingData ? "Načítání..." : "Žádné rehabilitační plány"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id} className="hover:bg-muted/50">
                      <TableCell>
                        {plan.client ? (
                          <span className="font-medium cursor-pointer hover:text-lagoon"
                            onClick={() => router.push(`/clients/${plan.client!.id}`)}>
                            {plan.client.first_name} {plan.client.last_name}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{plan.name}</div>
                        {plan.goals && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{plan.goals}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{plan.trainer?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {plan.start_date ? format(parseISO(plan.start_date), "d. M. yy") : "—"}
                        {plan.end_date && ` – ${format(parseISO(plan.end_date), "d. M. yy")}`}
                      </TableCell>
                      <TableCell className="text-sm">{plan.frequency || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Aktivní" : "Neaktivní"}
                        </Badge>
                      </TableCell>
                      {hasAnyPermission(["training.write_own", "training.write_all"]) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditDialog(plan)}>
                              Upravit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={() => toggleActive(plan)}>
                              {plan.is_active ? "Deaktivovat" : "Aktivovat"}
                            </Button>
                          </div>
                        </TableCell>
                      )}
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

        {/* ── CREATE/EDIT DIALOG ────────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Upravit plán" : "Nový rehabilitační plán"}</DialogTitle>
              <DialogDescription>
                {editingPlan ? "Upravte údaje plánu" : "Vytvořte nový rehabilitační nebo tréninkový plán"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
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

              <div>
                <Label>Název plánu *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Např. Rehabilitace po operaci kolene" />
              </div>

              <div>
                <Label>Terapeut / Trenér</Label>
                <Select value={form.trainer_id} onValueChange={(v) => setForm({ ...form, trainer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cíle</Label>
                <Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })}
                  rows={3} placeholder="Zlepšení pohyblivosti, posílení svalů..." />
              </div>

              <div>
                <Label>Popis</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder="Detailní popis plánu..." />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Začátek</Label>
                  <Input type="date" value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Konec</Label>
                  <Input type="date" value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
                <div>
                  <Label>Frekvence</Label>
                  <Input value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="2× týdně" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                <Label>Aktivní plán</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-lagoon hover:bg-lagoon/90">
                {saving ? "Ukládám..." : editingPlan ? "Uložit změny" : "Vytvořit plán"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
