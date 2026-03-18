// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, User, Heart, FileText,
  CreditCard, Clock, Shield, Pencil,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aktivní", variant: "default" },
  inactive: { label: "Neaktivní", variant: "secondary" },
  lead: { label: "Lead", variant: "outline" },
  archived: { label: "Archivovaný", variant: "destructive" },
};

const SEGMENT_MAP: Record<string, string> = {
  vip: "VIP", corporate: "Firemní", individual: "Individuální", student: "Student",
  senior: "Senior", wheelchair: "Vozíčkář", post_injury: "Po úrazu", chronic: "Chronický",
};

const GENDER_MAP: Record<string, string> = { male: "Muž", female: "Žena", other: "Jiné" };
const CONTACT_MAP: Record<string, string> = { email: "E-mail", sms: "SMS", phone: "Telefon", whatsapp: "WhatsApp" };

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const supabase = createClient();

  const [client, setClient] = useState<any>(null);
  const [staff, setStaff] = useState<Record<string, string>>({});
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClient = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      toast.error("Klient nenalezen.");
      router.push("/clients");
      return;
    }

    setClient(data);

    // Load staff names for assigned providers
    const staffIds = [data.primary_trainer_id, data.primary_physio_id, data.primary_doctor_id].filter(Boolean);
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", staffIds);
      const map: Record<string, string> = {};
      (staffData || []).forEach((s: any) => { map[s.id] = s.full_name; });
      setStaff(map);
    }

    // Load recent bookings
    if (hasPermission("bookings.read")) {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, services(name), users!bookings_provider_id_fkey(full_name)")
        .eq("client_id", params.id)
        .order("starts_at", { ascending: false })
        .limit(10);
      setBookings(bookingsData || []);
    }

    // Load recent payments
    if (hasPermission("payments.read")) {
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("client_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setPayments(paymentsData || []);
    }

    // Load medical records
    if (hasPermission("medical.read_all") || hasPermission("medical.read_own")) {
      const { data: medData } = await supabase
        .from("medical_records")
        .select("*, users!medical_records_provider_id_fkey(full_name)")
        .eq("client_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setMedicalRecords(medData || []);
    }

    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Načítání...
      </div>
    );
  }

  if (!client) return null;

  const age = client.date_of_birth
    ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <RequirePermission permission="clients.read">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Zpět
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {client.first_name} {client.last_name}
              </h1>
              <Badge variant={STATUS_MAP[client.status]?.variant || "secondary"}>
                {STATUS_MAP[client.status]?.label || client.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {client.gender && <span>{GENDER_MAP[client.gender]}</span>}
              {age !== null && <span>{age} let</span>}
              {client.source && <span>Zdroj: {client.source}</span>}
            </div>
            {(client.segments || []).length > 0 && (
              <div className="flex gap-1 mt-2">
                {client.segments.map((seg: string) => (
                  <Badge key={seg} variant="outline" className="text-xs">
                    {SEGMENT_MAP[seg] || seg}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {hasPermission("clients.write") && (
            <Button variant="outline" onClick={() => router.push(`/clients?edit=${client.id}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Upravit
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList>
            <TabsTrigger value="info">Informace</TabsTrigger>
            {hasPermission("clients.health.read") && (
              <TabsTrigger value="health">Zdraví</TabsTrigger>
            )}
            {hasPermission("bookings.read") && (
              <TabsTrigger value="bookings">Rezervace ({bookings.length})</TabsTrigger>
            )}
            {hasPermission("payments.read") && (
              <TabsTrigger value="finance">Finance ({payments.length})</TabsTrigger>
            )}
            {(hasPermission("medical.read_all") || hasPermission("medical.read_own")) && (
              <TabsTrigger value="medical">Záznamy ({medicalRecords.length})</TabsTrigger>
            )}
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Kontaktní údaje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow label="E-mail" value={client.email} icon={Mail} />
                  <InfoRow label="Telefon" value={client.phone} icon={Phone} />
                  <InfoRow label="Kontaktní preference" value={CONTACT_MAP[client.contact_preference]} icon={User} />
                  {(client.street || client.city) && (
                    <InfoRow
                      label="Adresa"
                      value={[client.street, client.postal_code, client.city].filter(Boolean).join(", ")}
                      icon={MapPin}
                    />
                  )}
                  <InfoRow label="Datum narození" value={client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString("cs-CZ") : null} icon={Calendar} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Přiřazení</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <InfoRow label="Trenér" value={staff[client.primary_trainer_id]} icon={User} />
                  <InfoRow label="Fyzioterapeut" value={staff[client.primary_physio_id]} icon={User} />
                  <InfoRow label="Lékař" value={staff[client.primary_doctor_id]} icon={User} />
                  {!client.primary_trainer_id && !client.primary_physio_id && !client.primary_doctor_id && (
                    <div className="text-sm text-muted-foreground py-2">Žádné přiřazení.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Poznámky</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.notes ? (
                    <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Žádné poznámky.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">GDPR souhlasy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className={`h-4 w-4 ${client.marketing_consent ? "text-green-600" : "text-muted-foreground"}`} />
                      <span className={client.marketing_consent ? "" : "text-muted-foreground"}>
                        Marketing {client.marketing_consent ? "✓" : "✗"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className={`h-4 w-4 ${client.health_data_consent ? "text-green-600" : "text-muted-foreground"}`} />
                      <span className={client.health_data_consent ? "" : "text-muted-foreground"}>
                        Zdravotní data {client.health_data_consent ? "✓" : "✗"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className={`h-4 w-4 ${client.photo_consent ? "text-green-600" : "text-muted-foreground"}`} />
                      <span className={client.photo_consent ? "" : "text-muted-foreground"}>
                        Fotografie {client.photo_consent ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Zdravotní omezení</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.health_restrictions ? (
                    <p className="text-sm whitespace-pre-wrap">{client.health_restrictions}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Žádná omezení.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Zdravotní cíle</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.health_goals ? (
                    <p className="text-sm whitespace-pre-wrap">{client.health_goals}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Žádné cíle.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Poslední rezervace</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Žádné rezervace.</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div>
                          <div className="font-medium text-sm">{b.services?.name || b.title || "Rezervace"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(b.starts_at).toLocaleDateString("cs-CZ")} {new Date(b.starts_at).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(b.ends_at).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                            {b.users?.full_name && ` · ${b.users.full_name}`}
                          </div>
                        </div>
                        <Badge variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "outline"}>
                          {b.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Poslední platby</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Žádné platby.</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div>
                          <div className="font-medium text-sm">{p.description || "Platba"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("cs-CZ")} · {p.method}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{Number(p.amount).toLocaleString("cs-CZ")} {p.currency}</div>
                          <Badge variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "outline"} className="text-xs">
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Tab */}
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zdravotní záznamy</CardTitle>
              </CardHeader>
              <CardContent>
                {medicalRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Žádné záznamy.</p>
                ) : (
                  <div className="space-y-3">
                    {medicalRecords.map((r) => (
                      <div key={r.id} className="border-b pb-3 last:border-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{r.title}</div>
                          <Badge variant="outline" className="text-xs">{r.type}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(r.created_at).toLocaleDateString("cs-CZ")}
                          {r.users?.full_name && ` · ${r.users.full_name}`}
                        </div>
                        <p className="text-sm mt-2 line-clamp-3">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
