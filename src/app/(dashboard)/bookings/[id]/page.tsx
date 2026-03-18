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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  User,
  MapPin,
  CreditCard,
  FileText,
  Phone,
  Mail,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { cs } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────

interface BookingDetail {
  id: string;
  client_id: string | null;
  provider_id: string | null;
  service_id: string | null;
  location_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  type: string;
  title: string | null;
  notes: string | null;
  internal_notes: string | null;
  cancellation_reason: string | null;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    date_of_birth: string | null;
  } | null;
  provider?: { id: string; full_name: string; email: string; phone: string | null } | null;
  service?: { id: string; name: string; price: number; duration_minutes: number; color: string | null } | null;
  location?: { id: string; name: string; type: string } | null;
  created_by_user?: { full_name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  confirmed: { label: "Potvrzená", variant: "default", icon: CheckCircle },
  pending: { label: "Čekající", variant: "secondary", icon: Clock },
  completed: { label: "Dokončená", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Zrušená", variant: "destructive", icon: XCircle },
  no_show: { label: "Nedostavil se", variant: "destructive", icon: AlertTriangle },
};

const TYPE_MAP: Record<string, string> = {
  individual: "Individuální",
  group: "Skupinová",
  course: "Kurz",
  medical: "Lékařská",
  physiotherapy: "Fyzioterapie",
};

// ── Component ──────────────────────────────────────────────────

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { hasPermission } = useAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadBooking = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone, date_of_birth),
        provider:users!bookings_provider_id_fkey(id, full_name, email, phone),
        service:services(id, name, price, duration_minutes, color),
        location:locations(id, name, type),
        created_by_user:users!bookings_created_by_fkey(full_name)
      `)
      .eq("id", params.id)
      .single();

    if (error) {
      console.error("Error loading booking:", error);
      toast.error("Chyba při načítání rezervace");
    } else {
      setBooking(data);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleStatusChange = async (status: string) => {
    if (!booking) return;
    setSaving(true);
    const payload: Record<string, unknown> = { status };
    if (status === "cancelled") {
      payload.cancellation_reason = cancellationReason || null;
    }
    const { error } = await supabase
      .from("bookings")
      .update(payload)
      .eq("id", booking.id);
    if (error) {
      toast.error("Chyba při změně stavu");
    } else {
      toast.success(
        status === "completed"
          ? "Rezervace dokončena"
          : status === "cancelled"
            ? "Rezervace zrušena"
            : status === "no_show"
              ? "Označeno jako nedostavil se"
              : "Stav změněn"
      );
      setCancelDialogOpen(false);
      setCancellationReason("");
      loadBooking();
    }
    setSaving(false);
  };

  // ── Loading skeleton ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <CalendarDays className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Rezervace nenalezena</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/bookings")}>
          <ArrowLeft className="size-4 mr-2" />
          Zpět na rezervace
        </Button>
      </div>
    );
  }

  const duration = differenceInMinutes(parseISO(booking.ends_at), parseISO(booking.starts_at));
  const statusInfo = STATUS_MAP[booking.status] || STATUS_MAP.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <RequirePermission permission="bookings.read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/bookings")}>
            <ArrowLeft className="size-4 mr-2" />
            Zpět
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {booking.service?.name || booking.title || "Rezervace"}
              </h1>
              <Badge variant={statusInfo.variant} className="text-xs">
                <StatusIcon className="size-3 mr-1" />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {TYPE_MAP[booking.type] || booking.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(parseISO(booking.starts_at), "EEEE d. MMMM yyyy", { locale: cs })}
              {" • "}
              {format(parseISO(booking.starts_at), "H:mm")}–{format(parseISO(booking.ends_at), "H:mm")}
              {" • "}
              {duration} min
            </p>
          </div>

          {/* Action buttons */}
          {hasPermission("bookings.write") && (
            <div className="flex items-center gap-2">
              {booking.status === "confirmed" && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange("completed")}
                    disabled={saving}
                  >
                    <CheckCircle className="size-4 mr-1" />
                    Dokončit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("no_show")}
                    disabled={saving}
                  >
                    <AlertTriangle className="size-4 mr-1" />
                    Nedostavil se
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={saving}
                  >
                    <XCircle className="size-4 mr-1" />
                    Zrušit
                  </Button>
                </>
              )}
              {booking.status === "pending" && (
                <Button
                  size="sm"
                  className="bg-lagoon hover:bg-lagoon/90"
                  onClick={() => handleStatusChange("confirmed")}
                  disabled={saving}
                >
                  <CheckCircle className="size-4 mr-1" />
                  Potvrdit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main info */}
          <div className="md:col-span-2 space-y-6">
            {/* Service & Time Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="size-4 text-lagoon" />
                  Detail rezervace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Služba</div>
                    <div className="flex items-center gap-2">
                      {booking.service?.color && (
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: booking.service.color }} />
                      )}
                      <span className="font-medium">{booking.service?.name || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cena</div>
                    <div className="font-medium">
                      {booking.service?.price ? `${booking.service.price.toLocaleString("cs-CZ")} Kč` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Datum</div>
                    <div className="font-medium">
                      {format(parseISO(booking.starts_at), "EEEE d. MMMM yyyy", { locale: cs })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Čas</div>
                    <div className="font-medium">
                      {format(parseISO(booking.starts_at), "H:mm")} – {format(parseISO(booking.ends_at), "H:mm")} ({duration} min)
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Místnost</div>
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3 text-muted-foreground" />
                      <span className="font-medium">{booking.location?.name || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Typ</div>
                    <div className="font-medium">{TYPE_MAP[booking.type] || booking.type}</div>
                  </div>
                </div>

                {booking.cancellation_reason && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-destructive uppercase tracking-wider mb-1">Důvod zrušení</div>
                      <p className="text-sm">{booking.cancellation_reason}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {(booking.notes || booking.internal_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4 text-lagoon" />
                    Poznámky
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {booking.notes && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Poznámka
                      </div>
                      <p className="text-sm">{booking.notes}</p>
                    </div>
                  )}
                  {booking.internal_notes && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Interní poznámka
                      </div>
                      <p className="text-sm bg-muted/50 p-2 rounded">{booking.internal_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Meta info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
                  <div>
                    <span className="uppercase tracking-wider">Vytvořeno:</span>{" "}
                    {format(parseISO(booking.created_at), "d. M. yyyy H:mm", { locale: cs })}
                    {booking.created_by_user && ` (${booking.created_by_user.full_name})`}
                  </div>
                  <div>
                    <span className="uppercase tracking-wider">Aktualizováno:</span>{" "}
                    {format(parseISO(booking.updated_at), "d. M. yyyy H:mm", { locale: cs })}
                  </div>
                  {booking.reminder_sent && (
                    <div>
                      <span className="uppercase tracking-wider">Připomínka:</span>{" "}
                      odeslána{" "}
                      {booking.reminder_sent_at &&
                        format(parseISO(booking.reminder_sent_at), "d. M. H:mm", { locale: cs })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4 text-lagoon" />
                  Klient
                </CardTitle>
              </CardHeader>
              <CardContent>
                {booking.client ? (
                  <div className="space-y-3">
                    <div
                      className="font-semibold text-lg cursor-pointer hover:text-lagoon transition-colors"
                      onClick={() => router.push(`/clients/${booking.client!.id}`)}
                    >
                      {booking.client.first_name} {booking.client.last_name}
                    </div>
                    {booking.client.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="size-3 text-muted-foreground" />
                        <a href={`tel:${booking.client.phone}`} className="hover:text-lagoon">
                          {booking.client.phone}
                        </a>
                      </div>
                    )}
                    {booking.client.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="size-3 text-muted-foreground" />
                        <a href={`mailto:${booking.client.email}`} className="hover:text-lagoon">
                          {booking.client.email}
                        </a>
                      </div>
                    )}
                    {booking.client.date_of_birth && (
                      <div className="text-xs text-muted-foreground">
                        Narozen/a: {format(parseISO(booking.client.date_of_birth), "d. M. yyyy")}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => router.push(`/clients/${booking.client!.id}`)}
                    >
                      Zobrazit profil klienta
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Bez přiřazeného klienta</p>
                )}
              </CardContent>
            </Card>

            {/* Provider card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4 text-orange" />
                  Terapeut / Trenér
                </CardTitle>
              </CardHeader>
              <CardContent>
                {booking.provider ? (
                  <div className="space-y-2">
                    <div className="font-semibold">{booking.provider.full_name}</div>
                    {booking.provider.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="size-3 text-muted-foreground" />
                        {booking.provider.phone}
                      </div>
                    )}
                    {booking.provider.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="size-3 text-muted-foreground" />
                        {booking.provider.email}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Bez přiřazeného terapeuta</p>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            {hasPermission("bookings.write") && booking.status !== "cancelled" && booking.status !== "completed" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rychlé akce</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {booking.status === "confirmed" && (
                    <>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                        onClick={() => handleStatusChange("completed")}
                        disabled={saving}
                      >
                        <CheckCircle className="size-4 mr-2" />
                        Dokončit rezervaci
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={() => handleStatusChange("no_show")}
                        disabled={saving}
                      >
                        <AlertTriangle className="size-4 mr-2" />
                        Nedostavil se
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        size="sm"
                        onClick={() => setCancelDialogOpen(true)}
                        disabled={saving}
                      >
                        <XCircle className="size-4 mr-2" />
                        Zrušit rezervaci
                      </Button>
                    </>
                  )}
                  {booking.status === "pending" && (
                    <Button
                      className="w-full bg-lagoon hover:bg-lagoon/90"
                      size="sm"
                      onClick={() => handleStatusChange("confirmed")}
                      disabled={saving}
                    >
                      <CheckCircle className="size-4 mr-2" />
                      Potvrdit rezervaci
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Cancel dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zrušit rezervaci</DialogTitle>
              <DialogDescription>
                {booking.service?.name || "Rezervace"} –{" "}
                {booking.client
                  ? `${booking.client.first_name} ${booking.client.last_name}`
                  : "bez klienta"}
                <br />
                {format(parseISO(booking.starts_at), "EEEE d. M. yyyy H:mm", { locale: cs })}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Důvod zrušení</Label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Volitelné — proč je rezervace rušena?"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Zpět
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleStatusChange("cancelled")}
                disabled={saving}
              >
                {saving ? "Ruším..." : "Zrušit rezervaci"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
