// @ts-nocheck
"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Settings, Building2, Clock, Mail, MessageSquare, Globe, Shield, Database,
} from "lucide-react";
import { toast } from "sonner";

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export default function SystemSettingsPage() {
  const supabase = createClient();
  const { loading: authLoading } = useAuth();

  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local form values
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const loadSettings = useCallback(async () => {
    setLoadingData(true);
    const { data, error } = await supabase.from("settings").select("*").order("key");
    if (error) {
      console.error(error);
    } else {
      setSettings(data || []);
      const values: Record<string, string> = {};
      (data || []).forEach((s) => { values[s.key] = s.value; });
      setFormValues(values);
    }
    setLoadingData(false);
  }, []);

  useEffect(() => { if (!authLoading) loadSettings(); }, [authLoading, loadSettings]);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    const { error } = await supabase.from("settings").update({ value }).eq("key", key);
    if (error) {
      toast.error("Chyba při ukládání");
    } else {
      toast.success("Nastavení uloženo");
    }
    setSaving(false);
  };

  const getValue = (key: string) => formValues[key] || "";
  const setValue = (key: string, value: string) => setFormValues((prev) => ({ ...prev, [key]: value }));

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
                <Input value={getValue("company_name")} onChange={(e) => setValue("company_name", e.target.value)}
                  onBlur={() => handleSave("company_name", getValue("company_name"))} />
              </div>
              <div>
                <Label>IČO</Label>
                <Input value={getValue("company_ico")} onChange={(e) => setValue("company_ico", e.target.value)}
                  onBlur={() => handleSave("company_ico", getValue("company_ico"))} />
              </div>
              <div>
                <Label>DIČ</Label>
                <Input value={getValue("company_dic")} onChange={(e) => setValue("company_dic", e.target.value)}
                  onBlur={() => handleSave("company_dic", getValue("company_dic"))} />
              </div>
              <div>
                <Label>Adresa</Label>
                <Input value={getValue("company_address")} onChange={(e) => setValue("company_address", e.target.value)}
                  onBlur={() => handleSave("company_address", getValue("company_address"))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefon</Label>
                  <Input value={getValue("company_phone")} onChange={(e) => setValue("company_phone", e.target.value)}
                    onBlur={() => handleSave("company_phone", getValue("company_phone"))} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={getValue("company_email")} onChange={(e) => setValue("company_email", e.target.value)}
                    onBlur={() => handleSave("company_email", getValue("company_email"))} />
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Otevření (Po-Pá)</Label>
                  <Input type="time" value={getValue("opening_time") || "07:00"} onChange={(e) => setValue("opening_time", e.target.value)}
                    onBlur={() => handleSave("opening_time", getValue("opening_time"))} />
                </div>
                <div>
                  <Label>Zavření (Po-Pá)</Label>
                  <Input type="time" value={getValue("closing_time") || "20:00"} onChange={(e) => setValue("closing_time", e.target.value)}
                    onBlur={() => handleSave("closing_time", getValue("closing_time"))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Otevření (So)</Label>
                  <Input type="time" value={getValue("saturday_open") || "08:00"} onChange={(e) => setValue("saturday_open", e.target.value)}
                    onBlur={() => handleSave("saturday_open", getValue("saturday_open"))} />
                </div>
                <div>
                  <Label>Zavření (So)</Label>
                  <Input type="time" value={getValue("saturday_close") || "14:00"} onChange={(e) => setValue("saturday_close", e.target.value)}
                    onBlur={() => handleSave("saturday_close", getValue("saturday_close"))} />
                </div>
              </div>
              <div>
                <Label>Minimální délka rezervace (min)</Label>
                <Input type="number" value={getValue("min_booking_duration") || "30"} onChange={(e) => setValue("min_booking_duration", e.target.value)}
                  onBlur={() => handleSave("min_booking_duration", getValue("min_booking_duration"))} />
              </div>
              <div>
                <Label>Maximální předstih rezervace (dny)</Label>
                <Input type="number" value={getValue("max_booking_advance_days") || "30"} onChange={(e) => setValue("max_booking_advance_days", e.target.value)}
                  onBlur={() => handleSave("max_booking_advance_days", getValue("max_booking_advance_days"))} />
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
                <Input type="number" value={getValue("reminder_hours_before") || "24"} onChange={(e) => setValue("reminder_hours_before", e.target.value)}
                  onBlur={() => handleSave("reminder_hours_before", getValue("reminder_hours_before"))} />
              </div>
              <div>
                <Label>Odesílací e-mail (From)</Label>
                <Input value={getValue("notification_from_email") || "noreply@rehagym.cz"} onChange={(e) => setValue("notification_from_email", e.target.value)}
                  onBlur={() => handleSave("notification_from_email", getValue("notification_from_email"))} />
              </div>
              <div>
                <Label>Jméno odesílatele</Label>
                <Input value={getValue("notification_from_name") || "RehaGym"} onChange={(e) => setValue("notification_from_name", e.target.value)}
                  onBlur={() => handleSave("notification_from_name", getValue("notification_from_name"))} />
              </div>
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
                <span className="font-medium">{settings.length} položek</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequirePermission>
  );
}
