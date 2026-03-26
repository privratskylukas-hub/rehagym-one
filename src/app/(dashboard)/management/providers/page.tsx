// @ts-nocheck
"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequirePermission } from "@/components/auth/require-permission";
import { PeriodPicker, useDefaultPeriod } from "@/components/shared/period-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Clock,
  Activity,
  TrendingUp,
  Plus,
  Save,
  Loader2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";
import { cs } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Constants ──────────────────────────────────────────────────

const COLORS = {
  lagoon: "#00818E",
  orange: "#FFAD00",
  green: "#22c55e",
  blue: "#3b82f6",
  red: "#ef4444",
};

const RATE_TYPES: Record<string, string> = {
  hourly: "Hodinová",
  session: "Za sezení",
  monthly_fixed: "Měsíční fixní",
};

const fmtCZK = (amount: number) =>
  amount.toLocaleString("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

// ── Component ──────────────────────────────────────────────────

export default function ProvidersPage() {
  const supabase = createClient();
  const { loading: authLoading } = useAuth();

  const [period, setPeriod] = useState(useDefaultPeriod("month"));
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Data
  const [providers, setProviders] = useState<any[]>([]);
  const [editingCells, setEditingCells] = useState<Record<string, Record<string, string>>>({});

  // Summary
  const [summary, setSummary] = useState({
    avgUtilization: 0,
    totalWorked: 0,
    totalClients: 0,
  });

  // Rate dialog
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [rateUserId, setRateUserId] = useState("");
  const [rateUserName, setRateUserName] = useState("");
  const [rates, setRates] = useState<any[]>([]);
  const [rateForm, setRateForm] = useState({
    rate_type: "hourly",
    amount: "",
    valid_from: format(new Date(), "yyyy-MM-dd"),
    valid_until: "",
    notes: "",
  });
  const [savingRate, setSavingRate] = useState(false);

  // ── Load data ────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const monthStr = format(startOfMonth(period.start), "yyyy-MM-dd");

    // Get all provider-type users (roles: physiotherapist, trainer, doctor)
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, user_roles(role:roles(slug))")
      .eq("is_active", true);

    const providerUsers = (users || []).filter((u) => {
      const slugs = (u.user_roles || []).map((ur: any) => ur.role?.slug);
      return slugs.some((s: string) => ["physiotherapist", "trainer", "doctor"].includes(s));
    });

    // Get monthly stats
    const { data: statsData } = await supabase
      .from("provider_monthly_stats")
      .select("*")
      .eq("month", monthStr);

    const statsMap = new Map<string, any>();
    (statsData || []).forEach((s) => statsMap.set(s.user_id, s));

    // Build provider rows
    const providerRows = providerUsers.map((u) => {
      const stat = statsMap.get(u.id) || {
        available_hours: 0,
        worked_hours: 0,
        client_count: 0,
        session_count: 0,
        revenue: 0,
        cost: 0,
        notes: "",
      };
      const utilization = stat.available_hours > 0
        ? Math.round((stat.worked_hours / stat.available_hours) * 100)
        : 0;
      const margin = Number(stat.revenue) - Number(stat.cost);

      return {
        user_id: u.id,
        name: u.full_name,
        stat_id: statsMap.get(u.id)?.id || null,
        available_hours: stat.available_hours,
        worked_hours: stat.worked_hours,
        client_count: stat.client_count,
        session_count: stat.session_count,
        revenue: Number(stat.revenue),
        cost: Number(stat.cost),
        utilization,
        margin,
        notes: stat.notes || "",
      };
    });

    setProviders(providerRows);

    // Summary
    const withHours = providerRows.filter((p) => p.available_hours > 0);
    setSummary({
      avgUtilization: withHours.length > 0
        ? Math.round(withHours.reduce((sum, p) => sum + p.utilization, 0) / withHours.length)
        : 0,
      totalWorked: providerRows.reduce((sum, p) => sum + p.worked_hours, 0),
      totalClients: providerRows.reduce((sum, p) => sum + p.client_count, 0),
    });

    setLoadingData(false);
  }, [period]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  // ── Inline editing ───────────────────────────────────────────

  const startEdit = (userId: string, field: string, currentValue: any) => {
    setEditingCells((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [field]: String(currentValue) },
    }));
  };

  const updateEditValue = (userId: string, field: string, value: string) => {
    setEditingCells((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [field]: value },
    }));
  };

  const cancelEdit = (userId: string, field: string) => {
    setEditingCells((prev) => {
      const next = { ...prev };
      if (next[userId]) {
        delete next[userId][field];
        if (Object.keys(next[userId]).length === 0) delete next[userId];
      }
      return next;
    });
  };

  const saveEdit = async (userId: string, field: string) => {
    const value = editingCells[userId]?.[field];
    if (value === undefined) return;

    const numValue = parseFloat(value) || 0;
    const monthStr = format(startOfMonth(period.start), "yyyy-MM-dd");

    setSaving(userId);

    // Check if stat row exists
    const provider = providers.find((p) => p.user_id === userId);
    const updateData: Record<string, any> = { [field]: numValue };

    if (provider?.stat_id) {
      // Update existing
      const { error } = await supabase
        .from("provider_monthly_stats")
        .update(updateData)
        .eq("id", provider.stat_id);

      if (error) {
        toast.error("Chyba při ukládání");
        console.error(error);
      } else {
        toast.success("Uloženo");
        cancelEdit(userId, field);
        loadData();
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from("provider_monthly_stats")
        .insert({
          user_id: userId,
          month: monthStr,
          [field]: numValue,
        });

      if (error) {
        toast.error("Chyba při ukládání");
        console.error(error);
      } else {
        toast.success("Uloženo");
        cancelEdit(userId, field);
        loadData();
      }
    }

    setSaving(null);
  };

  const isEditing = (userId: string, field: string) =>
    editingCells[userId]?.[field] !== undefined;

  // ── Editable cell component ──────────────────────────────────

  const EditableCell = ({ userId, field, value, suffix = "", isCurrency = false }: {
    userId: string; field: string; value: number; suffix?: string; isCurrency?: boolean;
  }) => {
    if (isEditing(userId, field)) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            className="h-7 w-20 text-xs text-right"
            value={editingCells[userId][field]}
            onChange={(e) => updateEditValue(userId, field, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit(userId, field);
              if (e.key === "Escape") cancelEdit(userId, field);
            }}
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-green-600"
            onClick={() => saveEdit(userId, field)}
            disabled={saving === userId}
          >
            {saving === userId ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          </Button>
        </div>
      );
    }

    return (
      <span
        className="cursor-pointer hover:text-lagoon hover:underline underline-offset-2 transition-colors"
        onClick={() => startEdit(userId, field, value)}
        title="Kliknutím upravíte"
      >
        {isCurrency ? fmtCZK(value) : `${value}${suffix}`}
      </span>
    );
  };

  // ── Rate management ──────────────────────────────────────────

  const openRateDialog = async (userId: string, userName: string) => {
    setRateUserId(userId);
    setRateUserName(userName);
    setRateForm({
      rate_type: "hourly",
      amount: "",
      valid_from: format(new Date(), "yyyy-MM-dd"),
      valid_until: "",
      notes: "",
    });

    // Load existing rates
    const { data } = await supabase
      .from("provider_rates")
      .select("*")
      .eq("user_id", userId)
      .order("valid_from", { ascending: false });

    setRates(data || []);
    setRateDialogOpen(true);
  };

  const handleSaveRate = async () => {
    if (!rateForm.amount || !rateUserId) {
      toast.error("Vyplňte částku");
      return;
    }

    setSavingRate(true);
    const { error } = await supabase
      .from("provider_rates")
      .insert({
        user_id: rateUserId,
        rate_type: rateForm.rate_type,
        amount: parseFloat(rateForm.amount),
        valid_from: rateForm.valid_from,
        valid_until: rateForm.valid_until || null,
        notes: rateForm.notes || null,
      });

    if (error) {
      toast.error("Chyba při ukládání sazby");
      console.error(error);
    } else {
      toast.success("Sazba přidána");
      // Reload rates
      const { data } = await supabase
        .from("provider_rates")
        .select("*")
        .eq("user_id", rateUserId)
        .order("valid_from", { ascending: false });
      setRates(data || []);
      setRateForm({ ...rateForm, amount: "", notes: "" });
    }
    setSavingRate(false);
  };

  const handleDeleteRate = async (rateId: string) => {
    const { error } = await supabase
      .from("provider_rates")
      .delete()
      .eq("id", rateId);

    if (error) {
      toast.error("Chyba při mazání");
    } else {
      setRates((prev) => prev.filter((r) => r.id !== rateId));
      toast.success("Sazba smazána");
    }
  };

  // ── Chart data ───────────────────────────────────────────────

  const chartData = providers
    .filter((p) => p.available_hours > 0 || p.worked_hours > 0)
    .map((p) => ({
      name: p.name?.split(" ").pop() || p.name,
      "Odpracováno": p.worked_hours,
      "Dostupné": p.available_hours,
    }));

  // ── Render ───────────────────────────────────────────────────

  return (
    <RequirePermission permission="management.providers">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trenéři a terapeuti</h1>
          <p className="text-sm text-muted-foreground">
            Vytížení, výkonnost a sazby poskytovatelů služeb
          </p>
        </div>

        {/* Period picker */}
        <PeriodPicker value={period} onChange={setPeriod} />

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Průměrné vytížení</CardTitle>
              <div className="rounded-lg p-2 text-lagoon bg-lagoon/10">
                <Activity className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avgUtilization}%</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    summary.avgUtilization >= 80 ? "bg-green-500" :
                    summary.avgUtilization >= 50 ? "bg-orange" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(summary.avgUtilization, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Celkem odpracováno</CardTitle>
              <div className="rounded-lg p-2 text-orange bg-orange/10">
                <Clock className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalWorked} h</div>
              <p className="text-xs text-muted-foreground mt-1">za vybrané období</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Celkem klientů</CardTitle>
              <div className="rounded-lg p-2 text-green-600 bg-green-100 dark:bg-green-900/30">
                <Users className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">unikátních klientů</p>
            </CardContent>
          </Card>
        </div>

        {/* Providers table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Přehled poskytovatelů</CardTitle>
            <CardDescription>Kliknutím na hodnotu ji můžete upravit</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead className="text-right">Dostupné h</TableHead>
                  <TableHead className="text-right">Odpracované h</TableHead>
                  <TableHead className="text-right">Vytížení %</TableHead>
                  <TableHead className="text-right">Klienti</TableHead>
                  <TableHead className="text-right">Tržby</TableHead>
                  <TableHead className="text-right">Náklady</TableHead>
                  <TableHead className="text-right">Marže</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {loadingData ? "Načítání..." : "Žádní poskytovatelé nalezeni"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  providers.map((p) => (
                    <TableRow key={p.user_id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">
                        <EditableCell userId={p.user_id} field="available_hours" value={p.available_hours} suffix=" h" />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell userId={p.user_id} field="worked_hours" value={p.worked_hours} suffix=" h" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={p.utilization >= 80 ? "default" : p.utilization >= 50 ? "secondary" : "destructive"}
                        >
                          {p.utilization}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell userId={p.user_id} field="client_count" value={p.client_count} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell userId={p.user_id} field="revenue" value={p.revenue} isCurrency />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell userId={p.user_id} field="cost" value={p.cost} isCurrency />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${p.margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {fmtCZK(p.margin)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openRateDialog(p.user_id, p.name)}
                        >
                          <Pencil className="size-3 mr-1" />
                          Sazby
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Provider comparison chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Porovnání vytížení</CardTitle>
              <CardDescription>Odpracované vs. dostupné hodiny</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload) return null;
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
                            <p className="font-medium mb-1">{label}</p>
                            {payload.map((entry: any, i: number) => (
                              <p key={i} style={{ color: entry.color }} className="text-xs">
                                {entry.name}: {entry.value} h
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Dostupné" fill={COLORS.blue} radius={[4, 4, 0, 0]} opacity={0.4} />
                    <Bar dataKey="Odpracováno" fill={COLORS.lagoon} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Rate Dialog ───────────────────────────────────────── */}
        <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Sazby — {rateUserName}</DialogTitle>
              <DialogDescription>Správa hodinových a měsíčních sazeb</DialogDescription>
            </DialogHeader>

            {/* Existing rates */}
            {rates.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Částka</TableHead>
                      <TableHead>Od</TableHead>
                      <TableHead>Do</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="text-xs">{RATE_TYPES[rate.rate_type] || rate.rate_type}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{fmtCZK(Number(rate.amount))}</TableCell>
                        <TableCell className="text-xs">{format(new Date(rate.valid_from), "d. M. yyyy")}</TableCell>
                        <TableCell className="text-xs">{rate.valid_until ? format(new Date(rate.valid_until), "d. M. yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-destructive"
                            onClick={() => handleDeleteRate(rate.id)}
                          >
                            Smazat
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Add new rate */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Přidat novou sazbu</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Typ sazby</Label>
                  <Select value={rateForm.rate_type} onValueChange={(v) => setRateForm({ ...rateForm, rate_type: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RATE_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Částka (Kč)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-xs"
                    placeholder="0"
                    value={rateForm.amount}
                    onChange={(e) => setRateForm({ ...rateForm, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Platnost od</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={rateForm.valid_from}
                    onChange={(e) => setRateForm({ ...rateForm, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Platnost do (nepovinné)</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={rateForm.valid_until}
                    onChange={(e) => setRateForm({ ...rateForm, valid_until: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Poznámka</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Nepovinná poznámka..."
                  value={rateForm.notes}
                  onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRateDialogOpen(false)}>
                Zavřít
              </Button>
              <Button
                onClick={handleSaveRate}
                disabled={savingRate}
                className="bg-lagoon hover:bg-lagoon/90"
              >
                {savingRate ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  <>
                    <Plus className="size-4 mr-2" />
                    Přidat sazbu
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
