// @ts-nocheck
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequirePermission } from "@/components/auth/require-permission";
import { PeriodPicker, useDefaultPeriod } from "@/components/shared/period-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  Percent,
  Heart,
} from "lucide-react";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
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

const fmtPct = (val: number) => `${Math.round(val)}%`;

// ── Component ──────────────────────────────────────────────────

export default function ManagementDashboardPage() {
  const supabase = createClient();
  const { loading: authLoading } = useAuth();

  const [period, setPeriod] = useState(useDefaultPeriod("month"));
  const [loadingData, setLoadingData] = useState(true);

  // ── KPI State ────────────────────────────────────────────────

  const [kpi, setKpi] = useState({
    totalRevenue: 0,
    prevRevenue: 0,
    respectRevenue: 0,
    respectPct: 0,
    personalTrainings: 0,
    diagnostikaCount: 0,
    avgUtilization: 0,
    totalCosts: 0,
    margin: 0,
    marginPct: 0,
  });

  // ── Chart State ──────────────────────────────────────────────

  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; amount: number }[]>([]);
  const [departmentPie, setDepartmentPie] = useState<{ name: string; value: number }[]>([]);
  const [categoryBars, setCategoryBars] = useState<{ category: string; amount: number }[]>([]);
  const [topProviders, setTopProviders] = useState<{ name: string; utilization: number; worked: number; available: number }[]>([]);

  // ── Previous period ──────────────────────────────────────────

  const prevPeriod = useMemo(() => {
    const diff = period.end.getTime() - period.start.getTime();
    return {
      start: new Date(period.start.getTime() - diff),
      end: new Date(period.end.getTime() - diff),
    };
  }, [period]);

  // ── Load data ────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const rangeStart = format(period.start, "yyyy-MM-dd");
    const rangeEnd = format(period.end, "yyyy-MM-dd");
    const prevStart = format(prevPeriod.start, "yyyy-MM-dd");
    const prevEnd = format(prevPeriod.end, "yyyy-MM-dd");

    const [
      revenueRes,
      prevRevenueRes,
      costsRes,
      providerStatsRes,
    ] = await Promise.all([
      // Current period revenue
      supabase
        .from("revenue_entries")
        .select("id, amount, category, code, department")
        .gte("date", rangeStart)
        .lte("date", rangeEnd),
      // Previous period revenue
      supabase
        .from("revenue_entries")
        .select("id, amount")
        .gte("date", prevStart)
        .lte("date", prevEnd),
      // Current period costs
      supabase
        .from("cost_entries")
        .select("id, amount")
        .gte("date", rangeStart)
        .lte("date", rangeEnd),
      // Provider stats for current month
      supabase
        .from("provider_monthly_stats")
        .select("user_id, available_hours, worked_hours, client_count, revenue, cost, user:users(full_name)")
        .gte("month", rangeStart)
        .lte("month", rangeEnd),
    ]);

    const revenue = revenueRes.data || [];
    const prevRevenue = prevRevenueRes.data || [];
    const costs = costsRes.data || [];
    const providerStats = providerStatsRes.data || [];

    // ── KPI Calculations ─────────────────────────────────────

    const totalRevenue = revenue.reduce((sum, r) => sum + Number(r.amount), 0);
    const prevTotalRevenue = prevRevenue.reduce((sum, r) => sum + Number(r.amount), 0);
    const respectRevenue = revenue.filter((r) => r.category === "RESPECT").reduce((sum, r) => sum + Number(r.amount), 0);
    const personalTrainings = revenue.filter((r) =>
      r.code && (r.code.includes("IDV") || r.code.includes("KLUB") || r.code.includes("ID_90"))
    ).length;
    const diagnostikaCount = revenue.filter((r) =>
      r.code && (r.code.includes("DIAG") || r.code.includes("DG"))
    ).length;

    const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);
    const margin = totalRevenue - totalCosts;
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

    // Provider utilization
    let avgUtilization = 0;
    if (providerStats.length > 0) {
      const utilizations = providerStats
        .filter((p) => p.available_hours > 0)
        .map((p) => (p.worked_hours / p.available_hours) * 100);
      avgUtilization = utilizations.length > 0
        ? utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length
        : 0;
    }

    setKpi({
      totalRevenue,
      prevRevenue: prevTotalRevenue,
      respectRevenue,
      respectPct: totalRevenue > 0 ? (respectRevenue / totalRevenue) * 100 : 0,
      personalTrainings,
      diagnostikaCount,
      avgUtilization,
      totalCosts,
      margin,
      marginPct,
    });

    // ── Monthly trend (last 6 months) ────────────────────────

    const sixMonthsAgo = subMonths(period.start, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(period.start) });

    const { data: trendData } = await supabase
      .from("revenue_entries")
      .select("date, amount")
      .gte("date", format(months[0], "yyyy-MM-dd"))
      .lte("date", format(endOfMonth(period.start), "yyyy-MM-dd"));

    const trendEntries = trendData || [];
    setMonthlyTrend(
      months.map((m) => {
        const monthStart = format(m, "yyyy-MM");
        const monthAmount = trendEntries
          .filter((e) => e.date.startsWith(monthStart))
          .reduce((sum, e) => sum + Number(e.amount), 0);
        return { month: format(m, "MMM yy", { locale: cs }), amount: monthAmount };
      })
    );

    // ── Department pie ───────────────────────────────────────

    const deptMap = new Map<string, number>();
    revenue.forEach((r) => {
      const dept = r.department || "Ostatní";
      deptMap.set(dept, (deptMap.get(dept) || 0) + Number(r.amount));
    });
    setDepartmentPie(
      Array.from(deptMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    );

    // ── Category bars ────────────────────────────────────────

    const catMap = new Map<string, number>();
    revenue.forEach((r) => {
      catMap.set(r.category, (catMap.get(r.category) || 0) + Number(r.amount));
    });
    setCategoryBars(
      Array.from(catMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
    );

    // ── Top providers ────────────────────────────────────────

    setTopProviders(
      providerStats
        .filter((p) => p.available_hours > 0)
        .map((p) => ({
          name: p.user?.full_name || "Neznámý",
          utilization: Math.round((p.worked_hours / p.available_hours) * 100),
          worked: p.worked_hours,
          available: p.available_hours,
        }))
        .sort((a, b) => b.utilization - a.utilization)
        .slice(0, 5)
    );

    setLoadingData(false);
  }, [period, prevPeriod]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs">
            {entry.name}: {typeof entry.value === "number" ? fmtCZK(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <RequirePermission permission="management.dashboard">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Přehled klíčových ukazatelů a výkonnosti
            </p>
          </div>
          <PeriodPicker value={period} onChange={setPeriod} />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Měsíční tržby */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Měsíční tržby</CardTitle>
              <div className="rounded-lg p-2 text-lagoon bg-lagoon/10">
                <DollarSign className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCZK(kpi.totalRevenue)}</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendBadge current={kpi.totalRevenue} previous={kpi.prevRevenue} />
                <span className="text-xs text-muted-foreground">vs minulé období</span>
              </div>
            </CardContent>
          </Card>

          {/* RESPECT příjmy */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">RESPECT příjmy</CardTitle>
              <div className="rounded-lg p-2 text-orange bg-orange/10">
                <Heart className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCZK(kpi.respectRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtPct(kpi.respectPct)} z celkových tržeb
              </p>
            </CardContent>
          </Card>

          {/* Osobní tréninky */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Osobní tréninky</CardTitle>
              <div className="rounded-lg p-2 text-green-600 bg-green-100 dark:bg-green-900/30">
                <Activity className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.personalTrainings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                + {kpi.diagnostikaCount} diagnostik
              </p>
            </CardContent>
          </Card>

          {/* Vytížení trenérů */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vytížení trenérů</CardTitle>
              <div className="rounded-lg p-2 text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                <Users className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtPct(kpi.avgUtilization)}</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(kpi.avgUtilization, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Marže */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Marže</CardTitle>
              <div className={`rounded-lg p-2 ${kpi.margin >= 0 ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-red-500 bg-red-100 dark:bg-red-900/30"}`}>
                <Percent className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                {fmtCZK(kpi.margin)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtPct(kpi.marginPct)} marže
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Monthly trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Měsíční tržby trend</CardTitle>
              <CardDescription>Posledních 6 měsíců</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.lagoon} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.lagoon} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Tržby"
                      stroke={COLORS.lagoon}
                      fill="url(#revGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Department pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tržby dle středisek</CardTitle>
              <CardDescription>GYM, REHA, Re.Life, PRODUKTY, Vouchery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {departmentPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {departmentPie.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => fmtCZK(value)} />
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

        {/* Bottom row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Category bars */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tržby dle kategorií</CardTitle>
              <CardDescription>RESPECT, BALICEK, KLUB_SKO, ZD_STD a další</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {categoryBars.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBars.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" name="Tržby" fill={COLORS.orange} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Žádná data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top providers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 trenérů dle vytížení</CardTitle>
              <CardDescription>Porovnání dostupných a odpracovaných hodin</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jméno</TableHead>
                    <TableHead className="text-right">Odpracováno</TableHead>
                    <TableHead className="text-right">Dostupné</TableHead>
                    <TableHead className="text-right">Vytížení</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProviders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Žádná data
                      </TableCell>
                    </TableRow>
                  ) : (
                    topProviders.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">{p.worked} h</TableCell>
                        <TableCell className="text-right">{p.available} h</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={p.utilization >= 80 ? "default" : p.utilization >= 50 ? "secondary" : "destructive"}>
                            {p.utilization}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequirePermission>
  );
}
