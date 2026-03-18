// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Megaphone, Mail, MessageSquare, Phone, Send, Eye,
  ChevronLeft, ChevronRight, Users, BarChart3, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  status: string;
  subject: string | null;
  content: string | null;
  recipient_count: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Communication {
  id: string;
  client_id: string;
  channel: string;
  direction: string;
  subject: string | null;
  content: string | null;
  sent_at: string | null;
  created_at: string;
  client?: { id: string; first_name: string; last_name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Koncept", variant: "secondary" },
  scheduled: { label: "Naplánovaná", variant: "outline" },
  sending: { label: "Odesílá se", variant: "default" },
  sent: { label: "Odesláno", variant: "default" },
  cancelled: { label: "Zrušená", variant: "destructive" },
};

const CHANNEL_MAP: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  email: { label: "E-mail", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  phone: { label: "Telefon", icon: Phone },
};

const PAGE_SIZE = 20;

export default function MarketingPage() {
  const supabase = createClient();
  const { user, loading: authLoading, hasPermission } = useAuth();

  const [tab, setTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [totalComms, setTotalComms] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", channel: "email", subject: "", content: "",
  });

  // ── Stats ────────────────────────────────────────────────────

  const [stats, setStats] = useState({ totalCampaigns: 0, totalSent: 0, totalOpened: 0, openRate: 0 });

  // ── Load campaigns ───────────────────────────────────────────

  const loadCampaigns = useCallback(async () => {
    setLoadingData(true);
    let query = supabase.from("campaigns").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) { toast.error("Chyba při načítání kampaní"); }
    else {
      setCampaigns(data || []);
      setTotalCampaigns(count || 0);

      // Stats
      const all = data || [];
      const sent = all.filter((c) => c.status === "sent");
      const totalSent = sent.reduce((s, c) => s + c.sent_count, 0);
      const totalOpened = sent.reduce((s, c) => s + c.opened_count, 0);
      setStats({
        totalCampaigns: count || 0,
        totalSent,
        totalOpened,
        openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      });
    }
    setLoadingData(false);
  }, [filterStatus, page]);

  // ── Load communications ──────────────────────────────────────

  const loadCommunications = useCallback(async () => {
    setLoadingData(true);
    const { data, error, count } = await supabase
      .from("communications")
      .select(`*, client:clients(id, first_name, last_name)`, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) { toast.error("Chyba při načítání komunikace"); }
    else { setCommunications(data || []); setTotalComms(count || 0); }
    setLoadingData(false);
  }, [page]);

  useEffect(() => {
    if (!authLoading) {
      if (tab === "campaigns") loadCampaigns();
      else loadCommunications();
    }
  }, [authLoading, tab, loadCampaigns, loadCommunications]);

  // ── Save campaign ────────────────────────────────────────────

  const resetForm = () => setForm({ name: "", description: "", channel: "email", subject: "", content: "" });

  const handleSave = async () => {
    if (!form.name) { toast.error("Vyplňte název kampaně"); return; }
    setSaving(true);
    const { error } = await supabase.from("campaigns").insert({
      name: form.name,
      description: form.description || null,
      channel: form.channel,
      subject: form.subject || null,
      content: form.content || null,
      status: "draft",
      created_by: user?.id || null,
    });
    if (error) { toast.error("Chyba při ukládání"); }
    else { toast.success("Kampaň vytvořena"); setDialogOpen(false); resetForm(); loadCampaigns(); }
    setSaving(false);
  };

  const totalPages = Math.ceil((tab === "campaigns" ? totalCampaigns : totalComms) / PAGE_SIZE);

  return (
    <RequirePermission permission="marketing.campaigns">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
            <p className="text-sm text-muted-foreground">Kampaně a komunikace s klienty</p>
          </div>
          {hasPermission("marketing.campaigns") && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-lagoon hover:bg-lagoon/90">
              <Plus className="size-4 mr-2" />Nová kampaň
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Kampaně</CardTitle>
              <Megaphone className="size-4 text-lagoon" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalCampaigns}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Odesláno</CardTitle>
              <Send className="size-4 text-orange" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalSent}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Otevřeno</CardTitle>
              <Eye className="size-4 text-green-600" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalOpened}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Rate</CardTitle>
              <BarChart3 className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.openRate}%</div></CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(0); }}>
          <TabsList>
            <TabsTrigger value="campaigns">Kampaně</TabsTrigger>
            <TabsTrigger value="communications">Komunikace</TabsTrigger>
          </TabsList>

          {/* ── CAMPAIGNS ───────────────────────────────────── */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex gap-3">
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
                    <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Stav" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všechny stavy</SelectItem>
                      {Object.entries(STATUS_MAP).map(([k, { label }]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary" className="text-xs self-center">{totalCampaigns} kampaní</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Název</TableHead>
                      <TableHead>Kanál</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead className="text-right">Odesláno</TableHead>
                      <TableHead className="text-right">Otevřeno</TableHead>
                      <TableHead>Datum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12">
                        <Megaphone className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{loadingData ? "Načítání..." : "Žádné kampaně"}</p>
                      </TableCell></TableRow>
                    ) : campaigns.map((c) => {
                      const ChannelIcon = CHANNEL_MAP[c.channel]?.icon || Mail;
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="font-medium">{c.name}</div>
                            {c.description && <div className="text-xs text-muted-foreground truncate max-w-[250px]">{c.description}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <ChannelIcon className="size-3.5 text-muted-foreground" />
                              {CHANNEL_MAP[c.channel]?.label || c.channel}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_MAP[c.status]?.variant || "secondary"}>
                              {STATUS_MAP[c.status]?.label || c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{c.sent_count}</TableCell>
                          <TableCell className="text-right">
                            {c.sent_count > 0 ? (
                              <span>{c.opened_count} <span className="text-muted-foreground">({Math.round((c.opened_count / c.sent_count) * 100)}%)</span></span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.sent_at ? format(parseISO(c.sent_at), "d. M. yyyy") : c.scheduled_at ? `Plán: ${format(parseISO(c.scheduled_at), "d. M.")}` : format(parseISO(c.created_at), "d. M. yyyy")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
          </TabsContent>

          {/* ── COMMUNICATIONS ──────────────────────────────── */}
          <TabsContent value="communications">
            <Card>
              <CardHeader className="pb-3">
                <Badge variant="secondary" className="text-xs w-fit">{totalComms} zpráv</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Kanál</TableHead>
                      <TableHead>Směr</TableHead>
                      <TableHead>Předmět</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communications.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12">
                        <Mail className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{loadingData ? "Načítání..." : "Žádná komunikace"}</p>
                      </TableCell></TableRow>
                    ) : communications.map((c) => {
                      const ChannelIcon = CHANNEL_MAP[c.channel]?.icon || Mail;
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/50">
                          <TableCell className="text-sm">{format(parseISO(c.created_at), "d. M. yyyy H:mm")}</TableCell>
                          <TableCell>
                            {c.client ? <span className="font-medium">{c.client.first_name} {c.client.last_name}</span> : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm"><ChannelIcon className="size-3.5" />{CHANNEL_MAP[c.channel]?.label || c.channel}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.direction === "outbound" ? "default" : "outline"}>
                              {c.direction === "outbound" ? "Odchozí" : "Příchozí"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{c.subject || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── CREATE CAMPAIGN DIALOG ────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nová kampaň</DialogTitle>
              <DialogDescription>Vytvořte e-mailovou nebo SMS kampaň</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Název kampaně *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Např. Jarní akce 2026" /></div>
              <div><Label>Popis</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Krátký popis účelu kampaně" /></div>
              <div>
                <Label>Kanál *</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_MAP).map(([k, { label }]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.channel === "email" && (
                <div><Label>Předmět e-mailu</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Předmět zprávy" /></div>
              )}
              <div><Label>Obsah zprávy</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} placeholder="Text kampaně..." /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-lagoon hover:bg-lagoon/90">
                {saving ? "Ukládám..." : "Vytvořit kampaň"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
