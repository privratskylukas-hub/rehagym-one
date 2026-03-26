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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
  X,
  Banknote,
  Wallet,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { cs } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────

interface Payment {
  id: string;
  client_id: string | null;
  amount: number;
  vat_amount: number;
  currency: string;
  method: string;
  status: string;
  booking_id: string | null;
  package_id: string | null;
  description: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  client?: { id: string; first_name: string; last_name: string } | null;
  booking?: { id: string; starts_at: string; service: { name: string } | null } | null;
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
  paid: { label: "Zaplaceno", variant: "default" },
  pending: { label: "Čeká na platbu", variant: "secondary" },
  overdue: { label: "Po splatnosti", variant: "destructive" },
  refunded: { label: "Vráceno", variant: "outline" },
  cancelled: { label: "Stornováno", variant: "destructive" },
};

const METHOD_MAP: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  cash: { label: "Hotovost", icon: Banknote },
  card: { label: "Karta", icon: CreditCard },
  bank_transfer: { label: "Převod", icon: Wallet },
  stripe: { label: "Stripe", icon: CreditCard },
  invoice: { label: "Faktura", icon: Receipt },
};

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────

export default function FinancePage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading, hasPermission } = useAuth();

  // Period
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  // Data
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    paidCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    cashAmount: 0,
    cardAmount: 0,
    transferAmount: 0,
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Client search in form
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form
  const [form, setForm] = useState({
    client_id: "",
    amount: "",
    vat_amount: "0",
    method: "cash",
    status: "paid",
    description: "",
    notes: "",
    paid_at: format(new Date(), "yyyy-MM-dd"),
  });

  // ── Load payments ────────────────────────────────────────────

  const loadPayments = useCallback(async () => {
    setLoadingData(true);

    const rangeStart = format(monthStart, "yyyy-MM-dd'T'00:00:00");
    const rangeEnd = format(addMonths(monthStart, 1), "yyyy-MM-dd'T'00:00:00");

    let query = supabase
      .from("payments")
      .select(`
        *,
        client:clients(id, first_name, last_name),
        booking:bookings(id, starts_at, service:services(name))
      `, { count: "exact" })
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEnd)
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterMethod !== "all") query = query.eq("method", filterMethod);

    if (searchQuery) {
      // Search via client name through join isn't directly supported; we filter client-side
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error loading payments:", error);
      toast.error("Chyba při načítání plateb");
    } else {
      let filtered = data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.client?.first_name?.toLowerCase().includes(q) ||
            p.client?.last_name?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
      }
      setPayments(filtered);
      setTotalCount(count || 0);
    }
    setLoadingData(false);
  }, [monthStart, filterStatus, filterMethod, searchQuery, page]);

  // ── Load stats ───────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    const rangeStart = format(monthStart, "yyyy-MM-dd'T'00:00:00");
    const rangeEnd = format(addMonths(monthStart, 1), "yyyy-MM-dd'T'00:00:00");

    const { data: allPayments } = await supabase
      .from("payments")
      .select("amount, status, method")
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEnd);

    if (allPayments) {
      const paid = allPayments.filter((p) => p.status === "paid");
      const pending = allPayments.filter((p) => p.status === "pending" || p.status === "overdue");

      setStats({
        totalRevenue: paid.reduce((sum, p) => sum + p.amount, 0),
        paidCount: paid.length,
        pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
        pendingCount: pending.length,
        cashAmount: paid.filter((p) => p.method === "cash").reduce((sum, p) => sum + p.amount, 0),
        cardAmount: paid.filter((p) => p.method === "card" || p.method === "stripe").reduce((sum, p) => sum + p.amount, 0),
        transferAmount: paid.filter((p) => p.method === "bank_transfer").reduce((sum, p) => sum + p.amount, 0),
      });
    }
  }, [monthStart]);

  useEffect(() => {
    if (!authLoading) {
      loadPayments();
      loadStats();
    }
  }, [authLoading, loadPayments, loadStats]);

  // ── Client search ────────────────────────────────────────────

  const searchClients = useCallback(async (q: string) => {
    if (q.length < 2) { setClientResults([]); return; }
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email, phone")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .eq("status", "active")
      .limit(10);
    setClientResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientSearch), 300);
    return () => clearTimeout(timer);
  }, [clientSearch, searchClients]);

  // ── Form helpers ─────────────────────────────────────────────

  const resetForm = () => {
    setForm({
      client_id: "",
      amount: "",
      vat_amount: "0",
      method: "cash",
      status: "paid",
      description: "",
      notes: "",
      paid_at: format(new Date(), "yyyy-MM-dd"),
    });
    setSelectedClient(null);
    setClientSearch("");
    setClientResults([]);
  };

  // ── Save payment ─────────────────────────────────────────────

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Zadejte platnou částku");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("payments").insert({
      client_id: form.client_id || null,
      amount,
      vat_amount: parseFloat(form.vat_amount) || 0,
      method: form.method,
      status: form.status,
      description: form.description || null,
      notes: form.notes || null,
      paid_at: form.status === "paid" ? `${form.paid_at}T00:00:00` : null,
      created_by: user?.id || null,
    });

    if (error) {
      console.error("Error saving payment:", error);
      toast.error("Chyba při ukládání platby");
    } else {
      toast.success("Platba zaznamenána");
      setDialogOpen(false);
      resetForm();
      loadPayments();
      loadStats();
    }
    setSaving(false);
  };

  // ── Mark as paid ─────────────────────────────────────────────

  const handleMarkPaid = async (payment: Payment) => {
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payment.id);
    if (error) {
      toast.error("Chyba");
    } else {
      toast.success("Platba označena jako zaplacená");
      loadPayments();
      loadStats();
    }
  };

  // ── Refund ───────────────────────────────────────────────────

  const handleRefund = async (payment: Payment) => {
    const { error } = await supabase
      .from("payments")
      .update({ status: "refunded" })
      .eq("id", payment.id);
    if (error) {
      toast.error("Chyba");
    } else {
      toast.success("Platba vrácena");
      loadPayments();
      loadStats();
    }
  };

  // ── Navigation ───────────────────────────────────────────────

  const goPrevMonth = () => { setCurrentMonth((d) => subMonths(d, 1)); setPage(0); };
  const goNextMonth = () => { setCurrentMonth((d) => addMonths(d, 1)); setPage(0); };
  const goThisMonth = () => { setCurrentMonth(new Date()); setPage(0); };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Format currency ──────────────────────────────────────────

  const fmtCZK = (amount: number) =>
    amount.toLocaleString("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

  // ── Render ───────────────────────────────────────────────────

  return (
    <RequirePermission permission="payments.read">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
            <p className="text-sm text-muted-foreground">
              Přehled plateb a tržeb
            </p>
          </div>
          {hasPermission("payments.write") && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-lagoon hover:bg-lagoon/90">
              <Plus className="size-4 mr-2" />
              Nová platba
            </Button>
          )}
        </div>

        {/* Month navigation */}
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

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Celkové tržby</CardTitle>
              <div className="rounded-lg p-2 text-lagoon bg-lagoon/10">
                <TrendingUp className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{fmtCZK(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.paidCount} plateb</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Čeká na platbu</CardTitle>
              <div className="rounded-lg p-2 text-orange bg-orange/10">
                <Clock className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{fmtCZK(stats.pendingAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.pendingCount} nevyřízených</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hotovost</CardTitle>
              <div className="rounded-lg p-2 text-green-600 bg-green-100 dark:bg-green-900/30">
                <Banknote className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{fmtCZK(stats.cashAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">hotovostní platby</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Karta + Převod</CardTitle>
              <div className="rounded-lg p-2 text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                <CreditCard className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{fmtCZK(stats.cardAmount + stats.transferAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">bezhotovostní platby</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters + Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat klienta, popis..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Stav" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny stavy</SelectItem>
                    {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterMethod} onValueChange={(v) => { setFilterMethod(v); setPage(0); }}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Způsob platby" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny způsoby</SelectItem>
                    {Object.entries(METHOD_MAP).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {totalCount} plateb
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Způsob</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>Stav</TableHead>
                  {hasPermission("payments.write") && (
                    <TableHead className="text-right">Akce</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <CreditCard className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {loadingData ? "Načítání..." : "Žádné platby v tomto měsíci"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => {
                    const MethodIcon = METHOD_MAP[payment.method]?.icon || CreditCard;
                    return (
                      <TableRow key={payment.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="text-sm font-medium">
                            {payment.paid_at
                              ? format(parseISO(payment.paid_at), "d. M. yyyy")
                              : format(parseISO(payment.created_at), "d. M. yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(payment.created_at), "H:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.client ? (
                            <span
                              className="font-medium cursor-pointer hover:text-lagoon"
                              onClick={() => router.push(`/clients/${payment.client!.id}`)}
                            >
                              {payment.client.first_name} {payment.client.last_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {payment.description || payment.booking?.service?.name || "—"}
                          </div>
                          {payment.booking && (
                            <div className="text-xs text-muted-foreground">
                              Rezervace {format(parseISO(payment.booking.starts_at), "d. M.")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <MethodIcon className="size-3.5 text-muted-foreground" />
                            {METHOD_MAP[payment.method]?.label || payment.method}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${payment.status === "refunded" ? "text-muted-foreground line-through" : ""}`}>
                            {fmtCZK(payment.amount)}
                          </span>
                          {payment.vat_amount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              vč. DPH {fmtCZK(payment.vat_amount)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[payment.status]?.variant || "secondary"}>
                            {STATUS_MAP[payment.status]?.label || payment.status}
                          </Badge>
                        </TableCell>
                        {hasPermission("payments.write") && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {(payment.status === "pending" || payment.status === "overdue") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-green-600"
                                  onClick={() => handleMarkPaid(payment)}
                                >
                                  ✓ Zaplatit
                                </Button>
                              )}
                              {payment.status === "paid" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive"
                                  onClick={() => handleRefund(payment)}
                                >
                                  ↩ Vrátit
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Strana {page + 1} z {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── CREATE PAYMENT DIALOG ─────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nová platba</DialogTitle>
              <DialogDescription>Zaznamenejte příchozí platbu</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Client */}
              <div className="space-y-2">
                <Label>Klient</Label>
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
                      onClick={() => { setSelectedClient(null); setForm({ ...form, client_id: "" }); }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Hledat klienta..."
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
                            <span className="font-medium">{c.first_name} {c.last_name}</span>
                            {c.email && <span className="text-muted-foreground ml-2">{c.email}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Částka (Kč) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>DPH (Kč)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.vat_amount}
                    onChange={(e) => setForm({ ...form, vat_amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Method & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Způsob platby *</Label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(METHOD_MAP).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stav</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Zaplaceno</SelectItem>
                      <SelectItem value="pending">Čeká na platbu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date */}
              {form.status === "paid" && (
                <div>
                  <Label>Datum platby</Label>
                  <Input
                    type="date"
                    value={form.paid_at}
                    onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <Label>Popis</Label>
                <Input
                  placeholder="Např. Fyzioterapie — vstupní vyšetření"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div>
                <Label>Poznámka</Label>
                <Textarea
                  rows={2}
                  placeholder="Interní poznámka..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Zrušit
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-lagoon hover:bg-lagoon/90">
                {saving ? "Ukládám..." : "Zaznamenat platbu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
