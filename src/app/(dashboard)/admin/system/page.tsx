// @ts-nocheck
"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequirePermission } from "@/components/auth/require-permission";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Clock, Mail, Database, FileText,
} from "lucide-react";
import { toast } from "sonner";

// ── Types matching the seeded JSONB shapes ──────────────────

interface CompanySettings {
  name: string;
  ico: string;
  dic: string;
  address: string;
  phone: string;
  email: string;
  web: string;
}

interface DayHours {
  open: string;
  close: string;
}

interface WorkingHoursSettings {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

interface BookingSettings {
  min_advance_hours: number;
  max_advance_days: number;
  cancellation_hours: number;
  reminder_hours_before: number;
  allow_online_booking: boolean;
}

interface InvoiceSettings {
  prefix: string;
  next_number: number;
  due_days: number;
  vat_rate: number;
}

const DEFAULT_COMPANY: CompanySettings = {
  name: "RehaGym s.r.o.", ico: "", dic: "", address: "", phone: "", email: "info@rehagym.cz", web: "https://rehagym.cz",
};

const DEFAULT_HOURS: WorkingHoursSettings = {
  monday: { open: "07:00", close: "21:00" },
  tuesday: { open: "07:00", close: "21:00" },
  wednesday: { open: "07:00", close: "21:00" },
  thursday: { open: "07:00", close: "21:00" },
  friday: { open: "07:00", close: "20:00" },
  saturday: { open: "08:00", close: "14:00" },
  sunday: null,
};

const DEFAULT_BOOKING: BookingSettings = {
  min_advance_hours: 2, max_advance_days: 30, cancellation_hours: 24, reminder_hours_before: 24, allow_online_booking: true,
};

const DEFAULT_INVOICE: InvoiceSettings = {
  prefix: "FV", next_number: 1, due_days: 14, vat_rate: 21,
};

const DAY_LABELS: Record<string, string> = {
  monday: "Pondělí", tuesday: "Úterý", wednesday: "Středa", thursday: "Čtvrtek",
  friday: "Pátek", saturday: "Sobota", sunday: "Neděle",
};

export default function SystemSettingsPage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [hours, setHours] = useState<WorkingHoursSettings>(DEFAULT_HOURS);
  const [booking, setBooking] = useState<BookingSettings>(DEFAULT_BOOKING);
  const [invoice, setInvoice] = useState<InvoiceSettings>(DEFAULT_INVOICE);
  const [loadingData, setLoadingData] = useState(true);
  const [settingsCount, setSettingsCount] = useState(0);

  const loadSettings = useCallback(async () => {
    setLoadingData(true);
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) {
      console.error(error);
      setLoadingData(false);
      return;
    }
    const map = new Map<string, any>();
    (data || []).forEach((row) => map.set(row.key, row.value));
    setSettingsCount(map.size);

    if (map.has("company")) setCompany({ ...DEFAULT_COMPANY, ...map.get("company") });
    if (map.has("working_hours")) setHours({ ...DEFAULT_HOURS, ...map.get("working_hours") });
    if (map.has("booking")) setBooking({ ...DEFAULT_BOOKING, ...map.get("booking") });
    if (map.has("invoice")) setInvoice({ ...DEFAULT_INVOICE, ...map.get("invoice") });
    setLoadingData(false);
  }, []);

  useEffect(() => { if (!authLoading) loadSettings(); }, [authLoading, loadSettings]);

  // Persist a single settings key back to DB
  async function saveKey(key: string, value: any) {
    const { error } = await supabase
      .from("settings")
      .update({ value, updated_by: user?.id || null })
      .eq("key", key);
    if (error) {
      toast.error("Chyba při ukládání");
      console.error(error);
    } else {
      toast.success("Uloženo");
    }
  }

  // Helpers to update nested state and persist
  function updateCompany(field: keyof CompanySettings, val: string) {
    setCompany((prev) => ({ ...prev, [field]: val }));
  }
  function saveCompany() { saveKey("company", company); }

  function updateDayHours(day: string, field: "open" | "close", val: string) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day as keyof WorkingHoursSettings] || { open: "", close: "" }), [field]: val },
    }));
  }
  function saveHours() { saveKey("working_hours", hours); }

  function updateBooking(field: keyof BookingSettings, val: string | number) {
    setBooking((prev) => ({ ...prev, [field]: typeof DEFAULT_BOOKING[field] === "number" ? Number(val) || 0 : val }));
  }
  function saveBooking() { saveKey("booking", booking); }

  function updateInvoice(field: keyof InvoiceSettings, val: string) {
    setInvoice((prev) => ({
      ...prev,
      [field]: typeof DEFAULT_INVOICE[field] === "number" ? Number(val) || 0 : val,
    }));
  }
  function saveInvoice() { saveKey("invoice", invoice); }

  return (
    <RequirePermission permission="admin.settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nastavení systému</h1>
          <p className="text-sm text-muted-foreground">Konfigurace provozního systému RehaGym ONE</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Company info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-4 text-lagoon" />
                Informace o firmě
              </CardTitle>
              <CardDescription>Základní údaje o společnosti</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Název společnosti</Label>
                <Input value={company.name} onChange={(e) => updateCompany("name", e.target.value)} onBlur={saveCompany} />
              </div>
              <div>
                <Label>IČO</Label>
                <Input value={company.ico} onChange={(e) => updateCompany("ico", e.target.value)} onBlur={saveCompany} />
              </div>
              <div>
                <Label>DIČ</Label>
                <Input value={company.dic} onChange={(e) => updateCompany("dic", e.target.value)} onBlur={saveCompany} />
              </div>
              <div>
                <Label>Adresa</Label>
                <Input value={company.address} onChange={(e) => updateCompany("address", e.target.value)} onBlur={saveCompany} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefon</Label>
                  <Input value={company.phone} onChange={(e) => updateCompany("phone", e.target.value)} onBlur={saveCompany} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={company.email} onChange={(e) => updateCompany("email", e.target.value)} onBlur={saveCompany} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4 text-lagoon" />
                Provozní hodiny
              </CardTitle>
              <CardDescription>Otevírací doba centra</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const).map((day) => (
                <div key={day} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center">
                  <Label className="text-xs">{DAY_LABELS[day]}</Label>
                  <Input
                    type="time"
                    value={hours[day]?.open || ""}
                    onChange={(e) => updateDayHours(day, "open", e.target.value)}
                    onBlur={saveHours}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="time"
                    value={hours[day]?.close || ""}
                    onChange={(e) => updateDayHours(day, "close", e.target.value)}
                    onBlur={saveHours}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Min. předstih rezervace (hod)</Label>
                  <Input type="number" value={booking.min_advance_hours}
                    onChange={(e) => updateBooking("min_advance_hours", e.target.value)} onBlur={saveBooking} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Max. předstih rezervace (dny)</Label>
                  <Input type="number" value={booking.max_advance_days}
                    onChange={(e) => updateBooking("max_advance_days", e.target.value)} onBlur={saveBooking} className="h-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Zrušení rezervace (hod předem)</Label>
                <Input type="number" value={booking.cancellation_hours}
                  onChange={(e) => updateBooking("cancellation_hours", e.target.value)} onBlur={saveBooking} className="h-8" />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="size-4 text-lagoon" />
                Notifikace
              </CardTitle>
              <CardDescription>Nastavení SMS a e-mailových upozornění</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Připomínka před rezervací (hodiny)</Label>
                <Input type="number" value={booking.reminder_hours_before}
                  onChange={(e) => updateBooking("reminder_hours_before", e.target.value)} onBlur={saveBooking} />
              </div>
              <div>
                <Label>Odesílací e-mail (From)</Label>
                <Input value={company.email} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground mt-1">Upravte v sekci Informace o firmě</p>
              </div>
            </CardContent>
          </Card>

          {/* Invoice settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-lagoon" />
                Fakturace
              </CardTitle>
              <CardDescription>Nastavení vystavování faktur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prefix faktury</Label>
                  <Input
                    value={invoice.prefix}
                    onChange={(e) => updateInvoice("prefix", e.target.value)}
                    onBlur={saveInvoice}
                    placeholder="FV"
                  />
                </div>
                <div>
                  <Label>Další číslo</Label>
                  <Input
                    type="number"
                    min="1"
                    value={invoice.next_number}
                    onChange={(e) => updateInvoice("next_number", e.target.value)}
                    onBlur={saveInvoice}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Splatnost (dny)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={invoice.due_days}
                    onChange={(e) => updateInvoice("due_days", e.target.value)}
                    onBlur={saveInvoice}
                  />
                </div>
                <div>
                  <Label>DPH (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={invoice.vat_rate}
                    onChange={(e) => updateInvoice("vat_rate", e.target.value)}
                    onBlur={saveInvoice}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Další vystavená faktura bude mít číslo{" "}
                <span className="font-mono font-medium text-foreground">
                  {invoice.prefix}{String(invoice.next_number).padStart(6, "0")}
                </span>
              </p>
            </CardContent>
          </Card>

          {/* System info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="size-4 text-lagoon" />
                Systémové informace
              </CardTitle>
              <CardDescription>Stav systému</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Verze</span>
                <span className="font-medium">1.0.0-alpha</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prostředí</span>
                <span className="font-medium">{process.env.NODE_ENV}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Supabase</span>
                <span className="font-medium text-green-600">Připojeno</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nastavení v DB</span>
                <span className="font-medium">{settingsCount} klíčů</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequirePermission>
  );
}
