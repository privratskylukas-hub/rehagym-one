// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarDays, CreditCard, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import { cs } from "date-fns/locale";
import Link from "next/link";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  loading,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "lagoon" | "orange" | "turquoise";
  loading?: boolean;
}) {
  const iconColors = {
    lagoon: "text-lagoon bg-lagoon/10",
    orange: "text-orange bg-orange/10",
    turquoise: "text-turquoise bg-turquoise/10",
  };
  const iconClass = accent ? iconColors[accent] : "text-muted-foreground bg-muted";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${iconClass}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface UpcomingBooking {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  client?: { first_name: string; last_name: string } | null;
  service?: { name: string; color: string | null } | null;
  provider?: { full_name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Potvrzená", variant: "default" },
  pending: { label: "Čekající", variant: "secondary" },
  completed: { label: "Dokončená", variant: "outline" },
  cancelled: { label: "Zrušená", variant: "destructive" },
};

export default function DashboardPage() {
  const { user, loading: authLoading, hasPermission } = useAuth();
  const supabase = createClient();

  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({
    activeClients: 0,
    todayBookings: 0,
    todayRevenue: 0,
    weekBookings: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [recentClients, setRecentClients] = useState<{ id: string; first_name: string; last_name: string; created_at: string }[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    const now = new Date();
    const todayStart = format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
    const todayEnd = format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
    const weekEnd = format(endOfDay(addDays(now, 7)), "yyyy-MM-dd'T'HH:mm:ss");

    const [clientsRes, todayBookingsRes, weekBookingsRes, todayPaymentsRes, upcomingRes, recentClientsRes] = await Promise.all([
      // Active clients count
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
      // Today's bookings count
      supabase.from("bookings").select("id", { count: "exact", head: true }).gte("starts_at", todayStart).lte("starts_at", todayEnd).in("status", ["confirmed", "completed"]),
      // This week bookings
      supabase.from("bookings").select("id", { count: "exact", head: true }).gte("starts_at", todayStart).lte("starts_at", weekEnd).in("status", ["confirmed", "pending"]),
      // Today's revenue
      supabase.from("payments").select("amount").eq("status", "paid").gte("paid_at", todayStart).lte("paid_at", todayEnd),
      // Upcoming bookings (next 10)
      supabase
        .from("bookings")
        .select(`
          id, starts_at, ends_at, status,
          client:clients(first_name, last_name),
          service:services(name, color),
          provider:users!bookings_provider_id_fkey(full_name)
        `)
        .gte("starts_at", todayStart)
        .in("status", ["confirmed", "pending"])
        .order("starts_at", { ascending: true })
        .limit(8),
      // Recent clients
      supabase
        .from("clients")
        .select("id, first_name, last_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const todayRevenue = (todayPaymentsRes.data || []).reduce((sum, p) => sum + p.amount, 0);

    setStats({
      activeClients: clientsRes.count || 0,
      todayBookings: todayBookingsRes.count || 0,
      todayRevenue,
      weekBookings: weekBookingsRes.count || 0,
    });

    setUpcomingBookings(upcomingRes.data || []);
    setRecentClients(recentClientsRes.data || []);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (!authLoading) loadDashboard();
  }, [authLoading, loadDashboard]);

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const fmtCZK = (amount: number) =>
    amount.toLocaleString("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dobrý den, {user?.full_name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          Přehled za dnešní den — {format(new Date(), "EEEE d. MMMM yyyy", { locale: cs })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {hasPermission("clients.read") && (
          <StatCard
            title="Aktivní klienti"
            value={String(stats.activeClients)}
            description="Celkový počet"
            icon={Users}
            accent="lagoon"
            loading={loadingData}
          />
        )}
        {hasPermission("bookings.read") && (
          <StatCard
            title="Dnešní rezervace"
            value={String(stats.todayBookings)}
            description="Potvrzené"
            icon={CalendarDays}
            accent="orange"
            loading={loadingData}
          />
        )}
        {hasPermission("payments.read") && (
          <StatCard
            title="Dnešní tržby"
            value={fmtCZK(stats.todayRevenue)}
            description="Zaplacené platby"
            icon={CreditCard}
            accent="lagoon"
            loading={loadingData}
          />
        )}
        {hasPermission("bookings.read") && (
          <StatCard
            title="Tento týden"
            value={String(stats.weekBookings)}
            description="Nadcházejících rezervací"
            icon={TrendingUp}
            accent="turquoise"
            loading={loadingData}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {hasPermission("bookings.read") && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Nadcházející rezervace</CardTitle>
                <CardDescription>Dnes a nejbližší dny</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/bookings">
                  Zobrazit vše
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarDays className="size-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Žádné nadcházející rezervace
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: booking.service?.color || "#00818E" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {booking.service?.name || "Rezervace"}
                          </span>
                          <Badge variant={STATUS_MAP[booking.status]?.variant || "secondary"} className="text-[10px] px-1.5 py-0">
                            {STATUS_MAP[booking.status]?.label || booking.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {booking.client
                            ? `${booking.client.first_name} ${booking.client.last_name}`
                            : "Bez klienta"}
                          {booking.provider && ` • ${booking.provider.full_name}`}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium">
                          {format(parseISO(booking.starts_at), "H:mm")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(booking.starts_at), "d. M.", { locale: cs })}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasPermission("clients.read") && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Noví klienti</CardTitle>
                <CardDescription>Naposledy přidaní</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/clients">
                  Zobrazit vše
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : recentClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="size-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Zatím žádní klienti
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentClients.map((client) => (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-lagoon/10 text-lagoon flex items-center justify-center text-sm font-semibold">
                        {client.first_name[0]}{client.last_name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {client.first_name} {client.last_name}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(client.created_at), "d. M.", { locale: cs })}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
