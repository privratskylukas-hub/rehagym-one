// @ts-nocheck
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  CalendarDays,
  CreditCard,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Clock,
  UserPlus,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Percent,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  differenceInDays,
} from "date-fns";
import { cs } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

// ── Constants ──────────────────────────────────────────────────

const COLORS = {
  lagoon: "#00818E",
  orange: "#FFAD00",
  turquoise: "#102A2B",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

const PIE_COLORS = [COLORS.lagoon, COLORS.orange, COLORS.green, COLORS.blue, COLORS.purple, COLORS.pink, COLORS.red];

const fmtCZK = (amount: number) =>
  amount.toLocaleString("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

// ── Component ──────────────────────────────────────────────────

export default function ReportsPage() {
  const supabase = createClient();
  const { loading: authLoading, hasPermission } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState("overview");

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const prevMonthStart = useMemo(() => startOfMonth(subMonths(currentMonth, 1)), [currentMonth]);
  const prevMonthEnd = useMemo(() => endOfMonth(subMonths(currentMonth, 1)), [currentMonth]);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  // ── Data state ───────────────────────────────────────────────

  const [stats, setStats] = useState({
    // Bookings
    totalBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    noShowBookings: 0,
    prevTotalBookings: 0,
    // Revenue
    totalRevenue: 0,
    prevRevenue: 0,
    cashRevenue: 0,
    cardRevenue: 0,
    transferRevenue: 0,
    // Clients
    totalClients: 0,
    activeClients: 0,
    newClients: 0,
    prevNewClients: 0,
  });

  const [dailyBookings, setDailyBookings] = useState<{ date: string; count: number; completed: number; cancelled: number }[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; amount: number }[]>([]);
  const [serviceStats, setServiceStats] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [providerStats, setProviderStats] = useState<{ name: string; bookings: number; completed: number; revenue: number }[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number }[]>([]);

  // ── Load all data ────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const rangeStart = format(monthStart, "yyyy-MM-dd'T'00:00:00");
    const rangeEnd = format(addMonths(monthStart, 1), "yyyy-MM-dd'T'00:00:00");
    const prevStart = format(prevMonthStart, "yyyy-MM-dd'T'00:00:00");
    const prevEnd = format(addMonths(prevMonthStart, 1), "yyyy-MM-dd'T'00:00:00");

    // Parallel fetch
    const [
      bookingsRes,
      prevBookingsRes,
      paymentsRes,
      prevPaymentsRes,
      clientsRes,
      newClientsRes,
      prevNewClientsRes,
      bookingServicesRes,
      bookingProvidersRes,
    ] = await Promise.all([
      // Current month bookings
      supabase.from("bookings").select("id, starts_at, status").gte("starts_at", rangeStart).lt("starts_at", rangeEnd),
      // Previous month bookings
      supabase.from("bookings").select("id, status").gte("starts_at", prevStart).lt("starts_at", prevEnd),
      // Current month payments
      supabase.from("payments").select("id, amount, method, status, paid_at, created_at").eq("status", "paid").gte("created_at", rangeStart).lt("created_at", rangeEnd),
      // Previous month payments
      supabase.from("payments").select("id, amount").eq("status", "paid").gte("created_at", prevStart).lt("created_at", prevEnd),
      // All clients
      supabase.from("clients").select("id, status", { count: "exact", head: true }),
      // New clients this month
      supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", rangeStart).lt("created_at", rangeEnd),
      // New clients prev month
      supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", prevStart).lt("created_at", prevEnd),
      // Bookings with services for breakdown
      supabase.from("bookings").select("id, status, service:services(name, price)").gte("starts_at", rangeStart).lt("starts_at", rangeEnd),
      // Bookings with providers
      supabase.from("bookings").select("id, status, provider:users!bookings_provider_id_fkey(full_name)").gte("starts_at", rangeStart).lt("starts_at", rangeEnd),
    ]);

    const bookings = bookingsRes.data || [];
    const prevBookings = prevBookingsRes.data || [];
    const payments = paymentsRes.data || [];
    const prevPayments = prevPaymentsRes.data || [];

    // ── Stats ──────────────────────────────────────────────

    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const noShow = bookings.filter((b) => b.status === "no_show").length;

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const prevRevenue = prevPayments.reduce((sum, p) => sum + p.amount, 0);

    setStats({
      totalBookings: bookings.length,
      confirmedBookings: confirmed,
      completedBookings: completed,
      cancelledBookings: cancelled,
      noShowBookings: noShow,
      prevTotalBookings: prevBookings.length,
      totalRevenue,
      prevRevenue,
      cashRevenue: payments.filter((p) => p.method === "cash").reduce((sum, p) => sum + p.amount, 0),
      cardRevenue: payments.filter((p) => p.method === "card" || p.method === "stripe").reduce((sum, p) => sum + p.amount, 0),
      transferRevenue: payments.filter((p) => p.method === "bank_transfer").reduce((sum, p) => sum + p.amount, 0),
      totalClients: clientsRes.count || 0,
      activeClients: 0, // would need separate query
      newClients: newClientsRes.count || 0,
      prevNewClients: prevNewClientsRes.count || 0,
    });

    // ── Daily bookings chart ───────────────────────────────

    setDailyBookings(
      daysInMonth.map((day) => {
        const dayBookings = bookings.filter((b) => isSameDay(parseISO(b.starts_at), day));
        return {
          date: format(day, "d."),
          count: dayBookings.length,
          completed: dayBookings.filter((b) => b.status === "completed").length,
          cancelled: dayBookings.filter((b) => b.status === "cancelled").length,
        };
      })
    );

    // ── Daily revenue chart ────────────────────────────────

    setDailyRevenue(
      daysInMonth.map((day) => {
        const dayPayments = payments.filter((p) => {
          const pDate = p.paid_at ? parseISO(p.paid_at) : parseISO(p.created_at);
          return isSameDay(pDate, day);
        });
        return {
          date: format(day, "d."),
          amount: dayPayments.reduce((sum, p) => sum + p.amount, 0),
        };
      })
    );

    // ── Service breakdown ──────────────────────────────────

    const serviceMap = new Map<string, { count: number; revenue: number }>();
    (bookingServicesRes.data || []).forEach((b) => {
      const name = b.service?.name || "Ostatní";
      const current = serviceMap.get(name) || { count: 0, revenue: 0 };
      current.count++;
      if (b.status === "completed" || b.status === "confirmed") {
        current.revenue += b.service?.price || 0;
      }
      serviceMap.set(name, current);
    });
    setServiceStats(
      Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
    );

    // ── Provider breakdown ─────────────────────────────────

    const providerMap = new Map<string, { bookings: number; completed: number; revenue: number }>();
    (bookingProvidersRes.data || []).forEach((b) => {
      const name = b.provider?.full_name || "Nepřiřazeno";
      const current = providerMap.get(name) || { bookings: 0, completed: 0, revenue: 0 };
      current.bookings++;
      if (b.status === "completed") current.completed++;
      providerMap.set(name, current);
    });
    setProviderStats(
      Array.from(providerMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.bookings - a.bookings)
    );

    // ── Status distribution ────────────────────────────────

    setStatusDistribution([
      { name: "Potvrzené", value: confirmed },
      { name: "Dokončené", value: completed },
      { name: "Zrušené", value: cancelled },
      { name: "Nedostavil se", value: noShow },
      { name: "Čekající", value: bookings.filter((b) => b.status === "pending").length },
    ].filter((d) => d.value > 0));

    setLoadingData(false);
  }, [monthStart, prevMonthStart, daysInMonth]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  // ── Helpers ──────────────────────────────────────────────────

  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const TrendBadge = ({ current, previous }: { current: number; previous: number }) => {
    const change = pctChange(current, previous);
    if (change === 0) return <span className="text-xs text-muted-foreground">beze změny</span>;
    const isUp = change > 0;
    return (
      <span className={`text-xs flex items-center gap-0.5 ${isUp ? "text-green-600" : "text-red-500"}`}>
        {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
        {isUp ? "+" : ""}{change}%
      </span>
    );
  };

  const goPrevMonth = () => setCurrentMonth((d) => subMonths(d, 1));
  const goNextMonth = () => setCurrentMonth((d) => addMonths(d, 1));
  const goThisMonth = () => setCurrentMonth(new Date());

  // ── Custom tooltip ───────────────────────────────────────────

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs">
            {entry.name}: {typeof entry.value === "number" && entry.name?.includes("Kč")
              ? fmtCZK(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <RequirePermission permissions={["reports.operational", "reports.financial"]}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reporty</h1>
            <p className="text-sm text-muted-foreground">
              Přehled výkonnosti a statistiky
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goThisMonth}>
              Tento měsíc
            </Button>
            <Button variant="outline" size="sm" onClick={goNextMonth}>
              <ChevronRight className="size-4" />
            </Button>
            <span className="font-semibold text-sm ml-2">
              {format(currentMonth, "LLLL yyyy", { locale: cs })}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Přehled</TabsTrigger>
            {hasPermission("reports.financial") && (
              <TabsTrigger value="finance">Tržby</TabsTrigger>
            )}
            <TabsTrigger value="bookings">Rezervace</TabsTrigger>
            <TabsTrigger value="providers">Terapeuti</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rezervace</CardTitle>
                  <div className="rounded-lg p-2 text-lagoon bg-lagoon/10">
                    <CalendarDays className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBookings}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendBadge current={stats.totalBookings} previous={stats.prevTotalBookings} />
                    <span className="text-xs text-muted-foreground">vs minulý měsíc</span>
                  </div>
                </CardContent>
              </Card>

              {hasPermission("reports.financial") && (
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Tržby</CardTitle>
                    <div className="rounded-lg p-2 text-orange bg-orange/10">
                      <CreditCard className="size-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtCZK(stats.totalRevenue)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <TrendBadge current={stats.totalRevenue} previous={stats.prevRevenue} />
                      <span className="text-xs text-muted-foreground">vs minulý měsíc</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Noví klienti</CardTitle>
                  <div className="rounded-lg p-2 text-green-600 bg-green-100 dark:bg-green-900/30">
                    <UserPlus className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.newClients}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendBadge current={stats.newClients} previous={stats.prevNewClients} />
                    <span className="text-xs text-muted-foreground">vs minulý měsíc</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Dokončení</CardTitle>
                  <div className="rounded-lg p-2 text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                    <Percent className="size-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalBookings > 0
                      ? `${Math.round((stats.completedBookings / stats.totalBookings) * 100)}%`
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.completedBookings} dokončených z {stats.totalBookings}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Daily bookings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rezervace po dnech</CardTitle>
                  <CardDescription>Počet rezervací za měsíc</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyBookings}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Celkem" fill={COLORS.lagoon} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="cancelled" name="Zrušené" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Status distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stavy rezervací</CardTitle>
                  <CardDescription>Rozložení dle stavu</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {statusDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {statusDistribution.map((_, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Žádná data
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Služby</CardTitle>
                <CardDescription>Nejpopulárnější služby za měsíc</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceStats.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serviceStats.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Počet" fill={COLORS.lagoon} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Žádná data</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FINANCE TAB ─────────────────────────────────── */}
          {hasPermission("reports.financial") && (
            <TabsContent value="finance" className="space-y-4">
              {/* Revenue cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Hotovost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtCZK(stats.cashRevenue)}</div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.totalRevenue ? (stats.cashRevenue / stats.totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Karta / Stripe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtCZK(stats.cardRevenue)}</div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.totalRevenue ? (stats.cardRevenue / stats.totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Bankovní převod</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtCZK(stats.transferRevenue)}</div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.totalRevenue ? (stats.transferRevenue / stats.totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Denní tržby</CardTitle>
                  <CardDescription>Příjmy po dnech za {format(currentMonth, "LLLL yyyy", { locale: cs })}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyRevenue}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.lagoon} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.lagoon} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.[0]) return null;
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
                                <p className="font-medium">{label}</p>
                                <p className="text-lagoon">{fmtCZK(payload[0].value as number)}</p>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          name="Tržby (Kč)"
                          stroke={COLORS.lagoon}
                          fill="url(#revenueGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by service */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tržby dle služeb</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Služba</TableHead>
                        <TableHead className="text-right">Počet</TableHead>
                        <TableHead className="text-right">Odhadované tržby</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            Žádná data
                          </TableCell>
                        </TableRow>
                      ) : (
                        serviceStats.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="text-right">{s.count}</TableCell>
                            <TableCell className="text-right font-medium">{fmtCZK(s.revenue)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── BOOKINGS TAB ────────────────────────────────── */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Potvrzené</div>
                  <div className="text-2xl font-bold text-lagoon">{stats.confirmedBookings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dokončené</div>
                  <div className="text-2xl font-bold text-green-600">{stats.completedBookings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Zrušené</div>
                  <div className="text-2xl font-bold text-red-500">{stats.cancelledBookings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Nedostavil se</div>
                  <div className="text-2xl font-bold text-orange">{stats.noShowBookings}</div>
                </CardContent>
              </Card>
            </div>

            {/* Bookings per day chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rezervace po dnech</CardTitle>
                <CardDescription>Denní rozložení rezervací</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyBookings}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="completed" name="Dokončené" stackId="a" fill={COLORS.green} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="count" name="Celkem" stackId="b" fill={COLORS.lagoon} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="cancelled" name="Zrušené" stackId="c" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PROVIDERS TAB ───────────────────────────────── */}
          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Výkonnost terapeutů</CardTitle>
                <CardDescription>Počet rezervací a dokončení za {format(currentMonth, "LLLL yyyy", { locale: cs })}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terapeut / Trenér</TableHead>
                      <TableHead className="text-right">Rezervace</TableHead>
                      <TableHead className="text-right">Dokončené</TableHead>
                      <TableHead className="text-right">Míra dokončení</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providerStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Žádná data
                        </TableCell>
                      </TableRow>
                    ) : (
                      providerStats.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right">{p.bookings}</TableCell>
                          <TableCell className="text-right">{p.completed}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={p.bookings > 0 && p.completed / p.bookings >= 0.8 ? "default" : "secondary"}>
                              {p.bookings > 0 ? `${Math.round((p.completed / p.bookings) * 100)}%` : "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Provider chart */}
            {providerStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rezervace dle terapeutů</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={providerStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="bookings" name="Celkem" fill={COLORS.lagoon} radius={[0, 4, 4, 0]} />
                        <Bar dataKey="completed" name="Dokončené" fill={COLORS.green} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
