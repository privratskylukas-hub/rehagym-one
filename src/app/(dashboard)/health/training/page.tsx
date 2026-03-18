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
import {
  Plus, Search, Dumbbell, User, X, ChevronLeft, ChevronRight, Star,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────

interface TrainingSession {
  id: string;
  plan_id: string | null;
  booking_id: string | null;
  client_id: string;
  trainer_id: string | null;
  date: string;
  duration_minutes: number | null;
  exercises: string | null;
  notes: string | null;
  performance_rating: number | null;
  client_feedback: string | null;
  created_at: string;
  client?: { id: string; first_name: string; last_name: string } | null;
  trainer?: { id: string; full_name: string } | null;
}

const PAGE_SIZE = 20;

export default function TrainingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading, hasPermission } = useAuth();

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [providers, setProviders] = useState<{ id: string; full_name: string }[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; first_name: string; last_name: string } | null>(null);

  const [form, setForm] = useState({
    client_id: "", trainer_id: "", date: format(new Date(), "yyyy-MM-dd"),
    duration_minutes: "60", exercises: "", notes: "", performance_rating: "",
    client_feedback: "",
  });

  const loadProviders = useCallback(async () => {
    const { data } = await supabase.from("users").select("id, full_name").eq("status", "active").order("full_name");
    if (data) setProviders(data);
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingData(true);
    let query = supabase
      .from("training_sessions")
      .select(`*, client:clients(id, first_name, last_name), trainer:users!training_sessions_trainer_id_fkey(id, full_name)`, { count: "exact" })
      .order("date", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) { console.error(error); toast.error("Chyba při načítání"); }
    else {
      let filtered = data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((s) => s.client?.first_name?.toLowerCase().includes(q) || s.client?.last_name?.toLowerCase().includes(q));
      }
      setSessions(filtered);
      setTotalCount(count || 0);
    }
    setLoadingData(false);
  }, [page, searchQuery]);

  useEffect(() => { loadProviders(); }, [loadProviders]);
  useEffect(() => { if (!authLoading) loadSessions(); }, [authLoading, loadSessions]);

  const searchClients = useCallback(async (q: string) => {
    if (q.length < 2) { setClientResults([]); return; }
    const { data } = await supabase.from("clients").select("id, first_name, last_name").or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`).limit(10);
    setClientResults(data || []);
  }, []);

  useEffect(() => { const t = setTimeout(() => searchClients(clientSearch), 300); return () => clearTimeout(t); }, [clientSearch, searchClients]);

  const resetForm = () => {
    setForm({ client_id: "", trainer_id: user?.id || "", date: format(new Date(), "yyyy-MM-dd"), duration_minutes: "60", exercises: "", notes: "", performance_rating: "", client_feedback: "" });
    setSelectedClient(null); setClientSearch(""); setEditingSession(null);
  };

  const openEdit = (s: TrainingSession) => {
    setEditingSession(s);
    setForm({
      client_id: s.client_id, trainer_id: s.trainer_id || "", date: s.date,
      duration_minutes: s.duration_minutes?.toString() || "60", exercises: s.exercises || "",
      notes: s.notes || "", performance_rating: s.performance_rating?.toString() || "",
      client_feedback: s.client_feedback || "",
    });
    if (s.client) setSelectedClient(s.client);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_id) { toast.error("Vyberte klienta"); return; }
    if (!form.date) { toast.error("Vyplňte datum"); return; }
    setSaving(true);
    const payload = {
      client_id: form.client_id, trainer_id: form.trainer_id || null, date: form.date,
      duration_minutes: parseInt(form.duration_minutes) || 60, exercises: form.exercises || null,
      notes: form.notes || null, performance_rating: form.performance_rating ? parseInt(form.performance_rating) : null,
      client_feedback: form.client_feedback || null,
    };
    let error;
    if (editingSession) { const r = await supabase.from("training_sessions").update(payload).eq("id", editingSession.id); error = r.error; }
    else { const r = await supabase.from("training_sessions").insert(payload); error = r.error; }
    if (error) { toast.error("Chyba při ukládání"); } else { toast.success(editingSession ? "Záznam upraven" : "Záznam vytvořen"); setDialogOpen(false); resetForm(); loadSessions(); }
    setSaving(false);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const RatingStars = ({ rating }: { rating: number | null }) => {
    if (!rating) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`size-3 ${i <= rating ? "fill-orange text-orange" : "text-muted-foreground/30"}`} />
        ))}
      </div>
    );
  };

  return (
    <RequirePermission permissions={["training.read_own", "training.read_all"]}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tréninkové záznamy</h1>
            <p className="text-sm text-muted-foreground">Záznamy z tréninků a cvičení</p>
          </div>
          {hasPermission("training.write") && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-lagoon hover:bg-lagoon/90">
              <Plus className="size-4 mr-2" />Nový záznam
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Hledat klienta..." value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} className="pl-9 h-9" />
              </div>
              <Badge variant="secondary" className="text-xs self-center">{totalCount} záznamů</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Trenér</TableHead>
                  <TableHead>Délka</TableHead>
                  <TableHead>Hodnocení</TableHead>
                  <TableHead>Cvičení</TableHead>
                  {hasPermission("training.write") && <TableHead className="text-right">Akce</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12">
                    <Dumbbell className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{loadingData ? "Načítání..." : "Žádné tréninkové záznamy"}</p>
                  </TableCell></TableRow>
                ) : sessions.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-sm">{format(parseISO(s.date), "d. M. yyyy")}</TableCell>
                    <TableCell>
                      {s.client ? (
                        <span className="font-medium cursor-pointer hover:text-lagoon" onClick={() => router.push(`/clients/${s.client!.id}`)}>
                          {s.client.first_name} {s.client.last_name}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{s.trainer?.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">{s.duration_minutes ? `${s.duration_minutes} min` : "—"}</TableCell>
                    <TableCell><RatingStars rating={s.performance_rating} /></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{s.exercises || "—"}</TableCell>
                    {hasPermission("training.write") && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(s)}>Upravit</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">Strana {page + 1} z {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSession ? "Upravit záznam" : "Nový tréninkový záznam"}</DialogTitle>
              <DialogDescription>Zaznamenejte průběh tréninku</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Klient *</Label>
                {selectedClient ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <User className="size-4 text-muted-foreground" />
                    <span className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0"
                      onClick={() => { setSelectedClient(null); setForm({ ...form, client_id: "" }); }}><X className="size-3" /></Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Hledat klienta..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-9" />
                    {clientResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {clientResults.map((c) => (
                          <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => { setSelectedClient(c); setForm({ ...form, client_id: c.id }); setClientSearch(""); setClientResults([]); }}>
                            {c.first_name} {c.last_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div><Label>Datum *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Délka (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
                <div>
                  <Label>Trenér</Label>
                  <Select value={form.trainer_id} onValueChange={(v) => setForm({ ...form, trainer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                    <SelectContent>{providers.map((p) => (<SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div><Label>Cvičení</Label><Textarea value={form.exercises} onChange={(e) => setForm({ ...form, exercises: e.target.value })} rows={4} placeholder="Seznam cviků, série, opakování..." /></div>
              <div><Label>Poznámky</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Poznámky k tréninku..." /></div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hodnocení výkonu (1-5)</Label>
                  <Select value={form.performance_rating} onValueChange={(v) => setForm({ ...form, performance_rating: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — Slabý</SelectItem>
                      <SelectItem value="2">2 — Podprůměrný</SelectItem>
                      <SelectItem value="3">3 — Průměrný</SelectItem>
                      <SelectItem value="4">4 — Dobrý</SelectItem>
                      <SelectItem value="5">5 — Výborný</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Zpětná vazba klienta</Label><Input value={form.client_feedback} onChange={(e) => setForm({ ...form, client_feedback: e.target.value })} placeholder="Jak se klient cítil..." /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-lagoon hover:bg-lagoon/90">
                {saving ? "Ukládám..." : editingSession ? "Uložit" : "Vytvořit záznam"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
