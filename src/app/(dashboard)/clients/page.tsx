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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight, Phone, Mail, User, X,
} from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  status: string;
  segments: string[];
  source: string | null;
  contact_preference: string;
  notes: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  health_restrictions: string | null;
  health_goals: string | null;
  marketing_consent: boolean;
  health_data_consent: boolean;
  photo_consent: boolean;
  primary_trainer_id: string | null;
  primary_physio_id: string | null;
  primary_doctor_id: string | null;
  created_at: string;
}

interface StaffUser {
  id: string;
  full_name: string;
  job_title: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aktivní", variant: "default" },
  inactive: { label: "Neaktivní", variant: "secondary" },
  lead: { label: "Lead", variant: "outline" },
  archived: { label: "Archivovaný", variant: "destructive" },
};

const SEGMENT_MAP: Record<string, string> = {
  vip: "VIP",
  corporate: "Firemní",
  individual: "Individuální",
  student: "Student",
  senior: "Senior",
  wheelchair: "Vozíčkář",
  post_injury: "Po úrazu",
  chronic: "Chronický",
};

const GENDER_MAP: Record<string, string> = {
  male: "Muž",
  female: "Žena",
  other: "Jiné",
};

const CONTACT_MAP: Record<string, string> = {
  email: "E-mail",
  sms: "SMS",
  phone: "Telefon",
  whatsapp: "WhatsApp",
};

const PAGE_SIZE = 20;

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  street: "",
  city: "",
  postal_code: "",
  contact_preference: "email",
  preferred_time: "",
  notes: "",
  status: "active",
  segments: [] as string[],
  source: "",
  health_restrictions: "",
  health_goals: "",
  marketing_consent: false,
  health_data_consent: false,
  photo_consent: false,
  primary_trainer_id: "",
  primary_physio_id: "",
  primary_doctor_id: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const { hasPermission, user } = useAuth();

  const loadClients = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("clients")
      .select("*", { count: "exact" })
      .order("last_name")
      .order("first_name")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(
        `last_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (segmentFilter !== "all") {
      query = query.contains("segments", [segmentFilter]);
    }

    const { data, count, error } = await query;

    if (error) {
      toast.error("Chyba při načítání klientů: " + error.message);
    } else {
      setClients(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }, [page, search, statusFilter, segmentFilter]);

  const loadStaff = useCallback(async () => {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, job_title")
      .eq("status", "active")
      .order("full_name");
    setStaff(data || []);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, segmentFilter]);

  const openCreateDialog = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setForm({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email || "",
      phone: client.phone || "",
      date_of_birth: client.date_of_birth || "",
      gender: client.gender || "",
      street: client.street || "",
      city: client.city || "",
      postal_code: client.postal_code || "",
      contact_preference: client.contact_preference || "email",
      preferred_time: "",
      notes: client.notes || "",
      status: client.status,
      segments: client.segments || [],
      source: client.source || "",
      health_restrictions: client.health_restrictions || "",
      health_goals: client.health_goals || "",
      marketing_consent: client.marketing_consent,
      health_data_consent: client.health_data_consent,
      photo_consent: client.photo_consent,
      primary_trainer_id: client.primary_trainer_id || "",
      primary_physio_id: client.primary_physio_id || "",
      primary_doctor_id: client.primary_doctor_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) {
      toast.error("Jméno a příjmení jsou povinné.");
      return;
    }

    setSaving(true);

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      street: form.street || null,
      city: form.city || null,
      postal_code: form.postal_code || null,
      contact_preference: form.contact_preference,
      notes: form.notes || null,
      status: form.status,
      segments: form.segments,
      source: form.source || null,
      health_restrictions: form.health_restrictions || null,
      health_goals: form.health_goals || null,
      marketing_consent: form.marketing_consent,
      health_data_consent: form.health_data_consent,
      photo_consent: form.photo_consent,
      primary_trainer_id: form.primary_trainer_id || null,
      primary_physio_id: form.primary_physio_id || null,
      primary_doctor_id: form.primary_doctor_id || null,
    };

    if (editingClient) {
      const { error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", editingClient.id);

      if (error) {
        toast.error("Chyba při ukládání: " + error.message);
      } else {
        toast.success("Klient aktualizován.");
        setDialogOpen(false);
        loadClients();
      }
    } else {
      const { error } = await supabase
        .from("clients")
        .insert({ ...payload, created_by: user?.id || null });

      if (error) {
        toast.error("Chyba při vytváření: " + error.message);
      } else {
        toast.success("Klient vytvořen.");
        setDialogOpen(false);
        loadClients();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Opravdu smazat klienta ${client.first_name} ${client.last_name}?`)) return;

    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) {
      toast.error("Chyba při mazání: " + error.message);
    } else {
      toast.success("Klient smazán.");
      loadClients();
    }
  };

  const toggleSegment = (segment: string) => {
    setForm((prev) => ({
      ...prev,
      segments: prev.segments.includes(segment)
        ? prev.segments.filter((s) => s !== segment)
        : [...prev.segments, segment],
    }));
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <RequirePermission permission="clients.read">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Klienti</h1>
            <p className="text-muted-foreground">
              Databáze klientů — {totalCount} {totalCount === 1 ? "klient" : totalCount < 5 ? "klienti" : "klientů"}
            </p>
          </div>
          {hasPermission("clients.write") && (
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nový klient
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Hledat podle jména, emailu, telefonu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="active">Aktivní</SelectItem>
                  <SelectItem value="inactive">Neaktivní</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="archived">Archivovaný</SelectItem>
                </SelectContent>
              </Select>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny segmenty</SelectItem>
                  {Object.entries(SEGMENT_MAP).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(search || statusFilter !== "all" || segmentFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => { setSearch(""); setStatusFilter("all"); setSegmentFilter("all"); }}
                >
                  <X className="mr-1 h-4 w-4" /> Zrušit filtry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Segmenty</TableHead>
                  <TableHead>Vytvořeno</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Načítání...
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {search || statusFilter !== "all" || segmentFilter !== "all"
                        ? "Žádní klienti neodpovídají filtrům."
                        : "Zatím žádní klienti. Vytvořte prvního klienta."}
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {client.last_name} {client.first_name}
                        </div>
                        {client.gender && (
                          <div className="text-xs text-muted-foreground">
                            {GENDER_MAP[client.gender] || client.gender}
                            {client.date_of_birth && ` · ${new Date().getFullYear() - new Date(client.date_of_birth).getFullYear()} let`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm">
                          {client.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {client.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_MAP[client.status]?.variant || "secondary"}>
                          {STATUS_MAP[client.status]?.label || client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(client.segments || []).map((seg) => (
                            <Badge key={seg} variant="outline" className="text-xs">
                              {SEGMENT_MAP[seg] || seg}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(client.created_at).toLocaleDateString("cs-CZ")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {hasPermission("clients.write") && (
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(client)}>
                              Upravit
                            </Button>
                          )}
                          {hasPermission("clients.delete") && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(client)}>
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
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Strana {page + 1} z {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? `Upravit: ${editingClient.first_name} ${editingClient.last_name}` : "Nový klient"}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? "Upravte údaje klienta." : "Vyplňte údaje nového klienta."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Basic info */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Základní údaje</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Jméno *</Label>
                    <Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Příjmení *</Label>
                    <Input id="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Datum narození</Label>
                    <Input id="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                  </div>
                  <div>
                    <Label>Pohlaví</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Muž</SelectItem>
                        <SelectItem value="female">Žena</SelectItem>
                        <SelectItem value="other">Jiné</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Adresa</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="street">Ulice</Label>
                    <Input id="street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">PSČ</Label>
                    <Input id="postal_code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor="city">Město</Label>
                    <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Klasifikace</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kontaktní preference</Label>
                    <Select value={form.contact_preference} onValueChange={(v) => setForm({ ...form, contact_preference: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTACT_MAP).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="source">Zdroj</Label>
                    <Input id="source" placeholder="Jak nás našel..." value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="mb-2 block">Segmenty</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SEGMENT_MAP).map(([key, label]) => (
                      <Badge
                        key={key}
                        variant={form.segments.includes(key) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleSegment(key)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assignments */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Přiřazení</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Trenér</Label>
                    <Select value={form.primary_trainer_id} onValueChange={(v) => setForm({ ...form, primary_trainer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Nevybrán" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Žádný</SelectItem>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fyzioterapeut</Label>
                    <Select value={form.primary_physio_id} onValueChange={(v) => setForm({ ...form, primary_physio_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Nevybrán" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Žádný</SelectItem>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lékař</Label>
                    <Select value={form.primary_doctor_id} onValueChange={(v) => setForm({ ...form, primary_doctor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Nevybrán" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Žádný</SelectItem>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Health */}
              {hasPermission("clients.health.read") && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Zdraví</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="health_restrictions">Zdravotní omezení</Label>
                      <Textarea id="health_restrictions" value={form.health_restrictions} onChange={(e) => setForm({ ...form, health_restrictions: e.target.value })} rows={2} />
                    </div>
                    <div>
                      <Label htmlFor="health_goals">Zdravotní cíle</Label>
                      <Textarea id="health_goals" value={form.health_goals} onChange={(e) => setForm({ ...form, health_goals: e.target.value })} rows={2} />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Poznámky</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>

              {/* GDPR Consents */}
              <div>
                <h3 className="text-sm font-semibold mb-3">GDPR souhlasy</h3>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.marketing_consent} onCheckedChange={(v) => setForm({ ...form, marketing_consent: !!v })} />
                    Souhlas s marketingovou komunikací
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.health_data_consent} onCheckedChange={(v) => setForm({ ...form, health_data_consent: !!v })} />
                    Souhlas se zpracováním zdravotních údajů
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.photo_consent} onCheckedChange={(v) => setForm({ ...form, photo_consent: !!v })} />
                    Souhlas s pořizováním fotografií
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Ukládám..." : editingClient ? "Uložit změny" : "Vytvořit klienta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
