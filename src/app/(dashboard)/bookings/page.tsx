// @ts-nocheck
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  User,
  MapPin,
  List,
  LayoutGrid,
  X,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  setHours,
  setMinutes,
  differenceInMinutes,
  isToday,
  addMinutes,
} from "date-fns";
import { cs } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────

interface Booking {
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
  created_at: string;
  client?: { id: string; first_name: string; last_name: string } | null;
  provider?: { id: string; full_name: string; color: string | null } | null;
  service?: { id: string; name: string; color: string | null; duration_minutes: number; price: number } | null;
  location?: { id: string; name: string } | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  color: string | null;
  is_active: boolean;
}

interface Location {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface Provider {
  id: string;
  full_name: string;
  color: string | null;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

// ── Constants ──────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Potvrzená", variant: "default" },
  pending: { label: "Čekající", variant: "secondary" },
  completed: { label: "Dokončená", variant: "outline" },
  cancelled: { label: "Zrušená", variant: "destructive" },
  no_show: { label: "Nedostavil se", variant: "destructive" },
};

const TYPE_MAP: Record<string, string> = {
  individual: "Individuální",
  group: "Skupinová",
  course: "Kurz",
  medical: "Lékařská",
  physiotherapy: "Fyzioterapie",
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const min = (i % 2) * 30;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
});

const DAYS_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

// ── Component ──────────────────────────────────────────────────

export default function BookingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading, hasPermission } = useAuth();

  // View state
  const [view, setView] = useState<"week" | "list">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterService, setFilterService] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    client_id: "",
    provider_id: "",
    service_id: "",
    location_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    type: "individual",
    status: "confirmed",
    title: "",
    notes: "",
    internal_notes: "",
    cancellation_reason: "",
  });

  // Client search in form
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // ── Load reference data ──────────────────────────────────────

  const loadReferenceData = useCallback(async () => {
    const [servicesRes, locationsRes, providersRes] = await Promise.all([
      supabase.from("services").select("id, name, duration_minutes, price, color, is_active").eq("is_active", true).order("sort_order"),
      supabase.from("locations").select("id, name, type, is_active").eq("is_active", true).order("name"),
      supabase.from("users").select("id, full_name, color").eq("status", "active").order("full_name"),
    ]);
    if (servicesRes.data) setServices(servicesRes.data);
    if (locationsRes.data) setLocations(locationsRes.data);
    if (providersRes.data) setProviders(providersRes.data);
  }, []);

  // ── Load bookings ────────────────────────────────────────────

  const loadBookings = useCallback(async () => {
    setLoadingData(true);

    const rangeStart = format(weekStart, "yyyy-MM-dd'T'00:00:00");
    const rangeEnd = format(addDays(weekEnd, 1), "yyyy-MM-dd'T'00:00:00");

    let query = supabase
      .from("bookings")
      .select(`
        *,
        client:clients(id, first_name, last_name),
        provider:users!bookings_provider_id_fkey(id, full_name, color),
        service:services(id, name, color, duration_minutes, price),
        location:locations(id, name)
      `)
      .gte("starts_at", rangeStart)
      .lt("starts_at", rangeEnd)
      .order("starts_at", { ascending: true });

    if (filterProvider !== "all") query = query.eq("provider_id", filterProvider);
    if (filterService !== "all") query = query.eq("service_id", filterService);
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterLocation !== "all") query = query.eq("location_id", filterLocation);

    const { data, error } = await query;

    if (error) {
      console.error("Error loading bookings:", error);
      toast.error("Chyba při načítání rezervací");
    } else {
      setBookings(data || []);
    }
    setLoadingData(false);
  }, [weekStart, weekEnd, filterProvider, filterService, filterStatus, filterLocation]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (!authLoading) loadBookings();
  }, [authLoading, loadBookings]);

  // ── Client search ────────────────────────────────────────────

  const searchClients = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setClientResults([]);
        return;
      }
      const { data } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, phone")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .eq("status", "active")
        .limit(10);
      setClientResults(data || []);
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientSearch), 300);
    return () => clearTimeout(timer);
  }, [clientSearch, searchClients]);

  // ── Auto-fill duration from service ──────────────────────────

  const selectedService = useMemo(
    () => services.find((s) => s.id === form.service_id),
    [services, form.service_id]
  );

  // ── Form helpers ─────────────────────────────────────────────

  const resetForm = () => {
    setForm({
      client_id: "",
      provider_id: "",
      service_id: "",
      location_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00",
      type: "individual",
      status: "confirmed",
      title: "",
      notes: "",
      internal_notes: "",
      cancellation_reason: "",
    });
    setSelectedClient(null);
    setClientSearch("");
    setClientResults([]);
    setEditingBooking(null);
  };

  const openCreateDialog = (date?: Date, time?: string) => {
    resetForm();
    if (date) setForm((f) => ({ ...f, date: format(date, "yyyy-MM-dd") }));
    if (time) setForm((f) => ({ ...f, time }));
    setDialogOpen(true);
  };

  const openEditDialog = (booking: Booking) => {
    setEditingBooking(booking);
    const startsAt = parseISO(booking.starts_at);
    setForm({
      client_id: booking.client_id || "",
      provider_id: booking.provider_id || "",
      service_id: booking.service_id || "",
      location_id: booking.location_id || "",
      date: format(startsAt, "yyyy-MM-dd"),
      time: format(startsAt, "HH:mm"),
      type: booking.type || "individual",
      status: booking.status || "confirmed",
      title: booking.title || "",
      notes: booking.notes || "",
      internal_notes: booking.internal_notes || "",
      cancellation_reason: booking.cancellation_reason || "",
    });
    if (booking.client) {
      setSelectedClient({
        id: booking.client.id,
        first_name: booking.client.first_name,
        last_name: booking.client.last_name,
        email: null,
        phone: null,
      });
    }
    setDialogOpen(true);
  };

  // ── Save booking ─────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.service_id) {
      toast.error("Vyberte službu");
      return;
    }
    if (!form.date || !form.time) {
      toast.error("Vyplňte datum a čas");
      return;
    }

    setSaving(true);

    const duration = selectedService?.duration_minutes || 60;
    const startsAt = `${form.date}T${form.time}:00`;
    const endsAt = format(addMinutes(parseISO(startsAt), duration), "yyyy-MM-dd'T'HH:mm:ss");

    const payload = {
      client_id: form.client_id || null,
      provider_id: form.provider_id || null,
      service_id: form.service_id || null,
      location_id: form.location_id || null,
      starts_at: startsAt,
      ends_at: endsAt,
      status: form.status,
      type: form.type,
      title: form.title || null,
      notes: form.notes || null,
      internal_notes: form.internal_notes || null,
    };

    let error;

    if (editingBooking) {
      const res = await supabase
        .from("bookings")
        .update(payload)
        .eq("id", editingBooking.id);
      error = res.error;
    } else {
      const res = await supabase
        .from("bookings")
        .insert({ ...payload, created_by: user?.id || null });
      error = res.error;
    }

    if (error) {
      console.error("Error saving booking:", error);
      toast.error("Chyba při ukládání rezervace");
    } else {
      toast.success(editingBooking ? "Rezervace aktualizována" : "Rezervace vytvořena");
      setDialogOpen(false);
      resetForm();
      loadBookings();
    }
    setSaving(false);
  };

  // ── Cancel booking ───────────────────────────────────────────

  const handleCancel = async () => {
    if (!cancellingBooking) return;
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: form.cancellation_reason || null,
      })
      .eq("id", cancellingBooking.id);

    if (error) {
      toast.error("Chyba při rušení rezervace");
    } else {
      toast.success("Rezervace zrušena");
      setCancelDialogOpen(false);
      setCancellingBooking(null);
      setForm((f) => ({ ...f, cancellation_reason: "" }));
      loadBookings();
    }
    setSaving(false);
  };

  // ── Complete booking ─────────────────────────────────────────

  const handleComplete = async (booking: Booking) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", booking.id);
    if (error) {
      toast.error("Chyba při dokončování");
    } else {
      toast.success("Rezervace dokončena");
      loadBookings();
    }
  };

  const handleNoShow = async (booking: Booking) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "no_show" })
      .eq("id", booking.id);
    if (error) {
      toast.error("Chyba");
    } else {
      toast.success("Označeno jako nedostavil se");
      loadBookings();
    }
  };

  // ── Navigation ───────────────────────────────────────────────

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => setCurrentDate((d) => subWeeks(d, 1));
  const goNext = () => setCurrentDate((d) => addWeeks(d, 1));

  // ── Filter bookings for list view ────────────────────────────

  const filteredBookings = useMemo(() => {
    if (!searchQuery) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter(
      (b) =>
        b.client?.first_name?.toLowerCase().includes(q) ||
        b.client?.last_name?.toLowerCase().includes(q) ||
        b.service?.name?.toLowerCase().includes(q) ||
        b.provider?.full_name?.toLowerCase().includes(q) ||
        b.title?.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  // ── Calendar helpers ─────────────────────────────────────────

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(parseISO(b.starts_at), day));

  const getBookingStyle = (booking: Booking) => {
    const start = parseISO(booking.starts_at);
    const end = parseISO(booking.ends_at);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = differenceInMinutes(end, start);
    const top = (startHour - 7) * 64; // 64px per hour
    const height = Math.max((duration / 60) * 64, 24);
    return { top: `${top}px`, height: `${height}px` };
  };

  const getBookingColor = (booking: Booking) => {
    if (booking.status === "cancelled") return "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 opacity-60";
    if (booking.status === "no_show") return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700";
    if (booking.status === "completed") return "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700";
    // Use service or provider color
    const color = booking.service?.color || booking.provider?.color;
    if (color) {
      return `border-l-4`;
    }
    return "bg-lagoon/10 border-lagoon/30 border-l-4 border-l-lagoon";
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <RequirePermission permission="bookings.read">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rezervace</h1>
            <p className="text-sm text-muted-foreground">
              Správa rezervací a plánování
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("week")}
                className="rounded-none"
              >
                <LayoutGrid className="size-4 mr-1" />
                Kalendář
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
                className="rounded-none"
              >
                <List className="size-4 mr-1" />
                Seznam
              </Button>
            </div>

            {hasPermission("bookings.write") && (
              <Button onClick={() => openCreateDialog()} className="bg-lagoon hover:bg-lagoon/90">
                <Plus className="size-4 mr-2" />
                Nová rezervace
              </Button>
            )}
          </div>
        </div>

        {/* Week navigation + filters */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrev}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Dnes
            </Button>
            <Button variant="outline" size="sm" onClick={goNext}>
              <ChevronRight className="size-4" />
            </Button>
            <span className="font-semibold text-sm ml-2">
              {format(weekStart, "d. MMM", { locale: cs })} –{" "}
              {format(weekEnd, "d. MMM yyyy", { locale: cs })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Terapeut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všichni terapeuti</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Služba" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny služby</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Stav" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Místnost" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny místnosti</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── WEEK VIEW ─────────────────────────────────────── */}
        {view === "week" && (
          <Card className="overflow-hidden">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="min-w-[800px]">
                {/* Day headers */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
                  <div className="p-2 border-r" />
                  {weekDays.map((day, i) => (
                    <div
                      key={i}
                      className={`p-2 text-center border-r last:border-r-0 ${
                        isToday(day) ? "bg-lagoon/5" : ""
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">
                        {DAYS_CS[i]}
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          isToday(day)
                            ? "text-lagoon"
                            : ""
                        }`}
                      >
                        {format(day, "d. M.")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time grid */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
                  {/* Time labels */}
                  <div className="border-r">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="h-16 flex items-start justify-end pr-2 pt-0 text-[10px] text-muted-foreground border-b"
                      >
                        {`${hour}:00`}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, dayIndex) => {
                    const dayBookings = getBookingsForDay(day);
                    return (
                      <div
                        key={dayIndex}
                        className={`relative border-r last:border-r-0 ${
                          isToday(day) ? "bg-lagoon/[0.02]" : ""
                        }`}
                        onClick={(e) => {
                          if (!hasPermission("bookings.write")) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const y = e.clientY - rect.top;
                          const hourOffset = y / 64 + 7;
                          const hour = Math.floor(hourOffset);
                          const min = Math.round((hourOffset - hour) * 2) * 30;
                          const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
                          openCreateDialog(day, time);
                        }}
                      >
                        {/* Hour lines */}
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="h-16 border-b border-dashed border-muted/50"
                          />
                        ))}

                        {/* Current time line */}
                        {isToday(day) && (
                          <div
                            className="absolute left-0 right-0 border-t-2 border-orange z-10 pointer-events-none"
                            style={{
                              top: `${(new Date().getHours() + new Date().getMinutes() / 60 - 7) * 64}px`,
                            }}
                          >
                            <div className="w-2 h-2 bg-orange rounded-full -mt-1 -ml-1" />
                          </div>
                        )}

                        {/* Booking cards */}
                        {dayBookings.map((booking) => {
                          const style = getBookingStyle(booking);
                          const serviceColor = booking.service?.color || booking.provider?.color || "#00818E";
                          const isCancelled = booking.status === "cancelled";
                          const isCompleted = booking.status === "completed";
                          return (
                            <div
                              key={booking.id}
                              className={`absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-[10px] leading-tight cursor-pointer overflow-hidden border transition-all hover:shadow-md hover:z-20 z-10 ${
                                isCancelled
                                  ? "bg-muted/50 border-muted-foreground/20 line-through opacity-50"
                                  : isCompleted
                                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                                    : "bg-background border-border"
                              }`}
                              style={{
                                ...style,
                                borderLeftWidth: "3px",
                                borderLeftColor: isCancelled ? "#999" : serviceColor,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasPermission("bookings.write")) {
                                  openEditDialog(booking);
                                } else {
                                  router.push(`/bookings/${booking.id}`);
                                }
                              }}
                            >
                              <div className="font-semibold truncate">
                                {booking.service?.name || booking.title || "Rezervace"}
                              </div>
                              {booking.client && (
                                <div className="truncate text-muted-foreground">
                                  {booking.client.first_name} {booking.client.last_name}
                                </div>
                              )}
                              <div className="text-muted-foreground">
                                {format(parseISO(booking.starts_at), "H:mm")}–
                                {format(parseISO(booking.ends_at), "H:mm")}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* ── LIST VIEW ─────────────────────────────────────── */}
        {view === "list" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Hledat klienta, službu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filteredBookings.length} rezervací
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum a čas</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Služba</TableHead>
                    <TableHead>Terapeut</TableHead>
                    <TableHead>Místnost</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <CalendarDays className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Žádné rezervace v tomto týdnu
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking) => (
                      <TableRow
                        key={booking.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/bookings/${booking.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium text-sm">
                            {format(parseISO(booking.starts_at), "EEEE d. M.", { locale: cs })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(booking.starts_at), "H:mm")} –{" "}
                            {format(parseISO(booking.ends_at), "H:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.client ? (
                            <span className="font-medium">
                              {booking.client.first_name} {booking.client.last_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {booking.service?.color && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: booking.service.color }}
                              />
                            )}
                            {booking.service?.name || booking.title || "—"}
                          </div>
                        </TableCell>
                        <TableCell>{booking.provider?.full_name || "—"}</TableCell>
                        <TableCell>{booking.location?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[booking.status]?.variant || "secondary"}>
                            {STATUS_MAP[booking.status]?.label || booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {hasPermission("bookings.write") && booking.status === "confirmed" && (
                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleComplete(booking)}
                              >
                                ✓ Dokončit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive"
                                onClick={() => {
                                  setCancellingBooking(booking);
                                  setCancelDialogOpen(true);
                                }}
                              >
                                ✕ Zrušit
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── CREATE/EDIT DIALOG ────────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBooking ? "Upravit rezervaci" : "Nová rezervace"}
              </DialogTitle>
              <DialogDescription>
                {editingBooking
                  ? "Upravte údaje rezervace"
                  : "Vyplňte údaje pro novou rezervaci"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Date & Time */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Čas
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Datum *</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Čas začátku *</Label>
                    <Select value={form.time} onValueChange={(v) => setForm({ ...form, time: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Délka</Label>
                    <Input
                      value={
                        selectedService
                          ? `${selectedService.duration_minutes} min`
                          : "—"
                      }
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Service */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Služba
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Služba *</Label>
                    <Select
                      value={form.service_id}
                      onValueChange={(v) => setForm({ ...form, service_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte službu" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              {s.color && (
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: s.color }}
                                />
                              )}
                              {s.name}{" "}
                              <span className="text-muted-foreground text-xs">
                                ({s.duration_minutes} min, {s.price} Kč)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Typ</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm({ ...form, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_MAP).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Klient
                </h3>
                {selectedClient ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <User className="size-4 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={() => {
                        setSelectedClient(null);
                        setForm({ ...form, client_id: "" });
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Hledat klienta (jméno, email, telefon)..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pl-9"
                    />
                    {clientResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {clientResults.map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => {
                              setSelectedClient(c);
                              setForm({ ...form, client_id: c.id });
                              setClientSearch("");
                              setClientResults([]);
                            }}
                          >
                            <span className="font-medium">
                              {c.first_name} {c.last_name}
                            </span>
                            {c.email && (
                              <span className="text-muted-foreground ml-2">
                                {c.email}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Provider & Location */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Přiřazení
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Terapeut / Trenér</Label>
                    <Select
                      value={form.provider_id}
                      onValueChange={(v) => setForm({ ...form, provider_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Místnost</Label>
                    <Select
                      value={form.location_id}
                      onValueChange={(v) => setForm({ ...form, location_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Status (edit only) */}
              {editingBooking && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Stav
                  </h3>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Poznámky
                </h3>
                <div>
                  <Label>Poznámka (viditelná klientovi)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    placeholder="Např. přineste sportovní oblečení..."
                  />
                </div>
                <div>
                  <Label>Interní poznámka</Label>
                  <Textarea
                    value={form.internal_notes}
                    onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                    rows={2}
                    placeholder="Poznámka pro personál..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Zrušit
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-lagoon hover:bg-lagoon/90"
              >
                {saving ? "Ukládám..." : editingBooking ? "Uložit změny" : "Vytvořit rezervaci"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── CANCEL DIALOG ─────────────────────────────────── */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zrušit rezervaci</DialogTitle>
              <DialogDescription>
                {cancellingBooking && (
                  <>
                    {cancellingBooking.service?.name || "Rezervace"} –{" "}
                    {cancellingBooking.client
                      ? `${cancellingBooking.client.first_name} ${cancellingBooking.client.last_name}`
                      : "bez klienta"}
                    <br />
                    {format(parseISO(cancellingBooking.starts_at), "EEEE d. M. yyyy H:mm", {
                      locale: cs,
                    })}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Důvod zrušení</Label>
              <Textarea
                value={form.cancellation_reason}
                onChange={(e) => setForm({ ...form, cancellation_reason: e.target.value })}
                placeholder="Volitelné — proč je rezervace rušena?"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Zpět
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={saving}>
                {saving ? "Ruším..." : "Zrušit rezervaci"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
