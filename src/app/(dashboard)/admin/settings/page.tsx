// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pencil, Plus, GripVertical, Palette, Clock, Users, DollarSign,
  Tag, MapPin, Layers, ChevronUp, ChevronDown, Package,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  vat_rate: number;
  max_participants: number;
  requires_equipment: boolean;
  is_active: boolean;
  color: string | null;
  sort_order: number;
  category_id: string | null;
  created_at: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  category: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Location {
  id: string;
  name: string;
  type: string;
  capacity: number;
  description: string | null;
  is_active: boolean;
}

const SERVICE_COLORS = [
  { value: "#00818E", label: "Lagoon" },
  { value: "#FFAD00", label: "Orange" },
  { value: "#3B82F6", label: "Modrá" },
  { value: "#10B981", label: "Zelená" },
  { value: "#8B5CF6", label: "Fialová" },
  { value: "#EF4444", label: "Červená" },
  { value: "#F59E0B", label: "Žlutá" },
  { value: "#EC4899", label: "Růžová" },
  { value: "#6B7280", label: "Šedá" },
];

const CATEGORY_TYPES = [
  { value: "fitness", label: "Fitness" },
  { value: "physiotherapy", label: "Fyzioterapie" },
  { value: "medical", label: "Lékařská péče" },
  { value: "massage", label: "Masáže" },
  { value: "group_class", label: "Skupinové lekce" },
  { value: "other", label: "Ostatní" },
];

const LOCATION_TYPES = [
  { value: "gym", label: "Posilovna" },
  { value: "treatment_room", label: "Ordinace" },
  { value: "group_room", label: "Skupinový sál" },
  { value: "massage_room", label: "Masážní místnost" },
  { value: "office", label: "Kancelář" },
  { value: "reception", label: "Recepce" },
  { value: "other", label: "Ostatní" },
];

const VAT_RATES = [
  { value: "0", label: "0 % (osvobozeno)" },
  { value: "12", label: "12 % (snížená)" },
  { value: "21", label: "21 % (základní)" },
];

// ── Component ──────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = createClient();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter
  const [serviceFilter, setServiceFilter] = useState<string>("all"); // category_id or "all"
  const [showInactive, setShowInactive] = useState(false);

  // Service dialog
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "", description: "", duration_minutes: "60", price: "0",
    vat_rate: "21", max_participants: "1", requires_equipment: false,
    is_active: true, color: "#00818E", sort_order: "0", category_id: "",
  });

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "", category: "fitness", description: "", sort_order: "0", is_active: true,
  });

  // Location dialog
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: "", type: "gym", capacity: "1", description: "", is_active: true,
  });

  // ── Data loading ─────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [servicesRes, categoriesRes, locationsRes] = await Promise.all([
      supabase.from("services").select("*").order("sort_order, name"),
      supabase.from("service_categories").select("*").order("sort_order, name"),
      supabase.from("locations").select("*").order("name"),
    ]);
    setServices(servicesRes.data || []);
    setCategories(categoriesRes.data || []);
    setLocations(locationsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtered services ────────────────────────────────────

  const filteredServices = services.filter((s) => {
    if (!showInactive && !s.is_active) return false;
    if (serviceFilter !== "all" && s.category_id !== serviceFilter) return false;
    return true;
  });

  // Group services by category for display
  const servicesByCategory = new Map<string, Service[]>();
  filteredServices.forEach((s) => {
    const catId = s.category_id || "__none__";
    if (!servicesByCategory.has(catId)) servicesByCategory.set(catId, []);
    servicesByCategory.get(catId)!.push(s);
  });

  const getCategoryName = (id: string | null) => {
    if (!id) return "Bez kategorie";
    return categories.find((c) => c.id === id)?.name || "Neznámá";
  };

  const getCategoryTypeName = (type: string) =>
    CATEGORY_TYPES.find((t) => t.value === type)?.label || type;

  const getLocationTypeName = (type: string) =>
    LOCATION_TYPES.find((t) => t.value === type)?.label || type;

  // ── Service CRUD ─────────────────────────────────────────

  function openServiceDialog(service?: Service) {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name, description: service.description || "",
        duration_minutes: service.duration_minutes.toString(),
        price: service.price.toString(), vat_rate: (service.vat_rate || 21).toString(),
        max_participants: service.max_participants.toString(),
        requires_equipment: service.requires_equipment,
        is_active: service.is_active, color: service.color || "#00818E",
        sort_order: service.sort_order.toString(),
        category_id: service.category_id || "",
      });
    } else {
      setEditingService(null);
      const maxSort = services.length > 0 ? Math.max(...services.map((s) => s.sort_order)) + 1 : 0;
      setServiceForm({
        name: "", description: "", duration_minutes: "60", price: "0",
        vat_rate: "21", max_participants: "1", requires_equipment: false,
        is_active: true, color: "#00818E", sort_order: maxSort.toString(),
        category_id: "",
      });
    }
    setServiceDialogOpen(true);
  }

  async function saveService() {
    if (!serviceForm.name.trim()) { toast.error("Vyplňte název služby"); return; }
    setSaving(true);
    const payload = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || null,
      duration_minutes: parseInt(serviceForm.duration_minutes) || 60,
      price: parseFloat(serviceForm.price) || 0,
      vat_rate: parseFloat(serviceForm.vat_rate) || 21,
      max_participants: parseInt(serviceForm.max_participants) || 1,
      requires_equipment: serviceForm.requires_equipment,
      is_active: serviceForm.is_active,
      color: serviceForm.color || null,
      sort_order: parseInt(serviceForm.sort_order) || 0,
      category_id: serviceForm.category_id || null,
    };
    let error;
    if (editingService) {
      const r = await supabase.from("services").update(payload).eq("id", editingService.id);
      error = r.error;
    } else {
      const r = await supabase.from("services").insert(payload);
      error = r.error;
    }
    if (error) { toast.error(error.message); }
    else { toast.success(editingService ? "Služba upravena" : "Služba vytvořena"); setServiceDialogOpen(false); loadData(); }
    setSaving(false);
  }

  async function toggleServiceActive(service: Service) {
    const { error } = await supabase.from("services").update({ is_active: !service.is_active }).eq("id", service.id);
    if (error) toast.error(error.message);
    else { toast.success(service.is_active ? "Služba deaktivována" : "Služba aktivována"); loadData(); }
  }

  async function moveService(service: Service, direction: "up" | "down") {
    const sameCat = services.filter((s) => s.category_id === service.category_id).sort((a, b) => a.sort_order - b.sort_order);
    const idx = sameCat.findIndex((s) => s.id === service.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sameCat.length) return;
    const other = sameCat[swapIdx];
    await Promise.all([
      supabase.from("services").update({ sort_order: other.sort_order }).eq("id", service.id),
      supabase.from("services").update({ sort_order: service.sort_order }).eq("id", other.id),
    ]);
    loadData();
  }

  // ── Category CRUD ────────────────────────────────────────

  function openCategoryDialog(cat?: ServiceCategory) {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({
        name: cat.name, category: cat.category, description: cat.description || "",
        sort_order: cat.sort_order.toString(), is_active: cat.is_active,
      });
    } else {
      setEditingCategory(null);
      const maxSort = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0;
      setCategoryForm({ name: "", category: "fitness", description: "", sort_order: maxSort.toString(), is_active: true });
    }
    setCategoryDialogOpen(true);
  }

  async function saveCategory() {
    if (!categoryForm.name.trim()) { toast.error("Vyplňte název kategorie"); return; }
    setSaving(true);
    const payload = {
      name: categoryForm.name.trim(),
      category: categoryForm.category,
      description: categoryForm.description.trim() || null,
      sort_order: parseInt(categoryForm.sort_order) || 0,
      is_active: categoryForm.is_active,
    };
    let error;
    if (editingCategory) {
      const r = await supabase.from("service_categories").update(payload).eq("id", editingCategory.id);
      error = r.error;
    } else {
      const r = await supabase.from("service_categories").insert(payload);
      error = r.error;
    }
    if (error) { toast.error(error.message); }
    else { toast.success(editingCategory ? "Kategorie upravena" : "Kategorie vytvořena"); setCategoryDialogOpen(false); loadData(); }
    setSaving(false);
  }

  // ── Location CRUD ────────────────────────────────────────

  function openLocationDialog(loc?: Location) {
    if (loc) {
      setEditingLocation(loc);
      setLocationForm({
        name: loc.name, type: loc.type, capacity: loc.capacity.toString(),
        description: loc.description || "", is_active: loc.is_active,
      });
    } else {
      setEditingLocation(null);
      setLocationForm({ name: "", type: "gym", capacity: "1", description: "", is_active: true });
    }
    setLocationDialogOpen(true);
  }

  async function saveLocation() {
    if (!locationForm.name.trim()) { toast.error("Vyplňte název"); return; }
    setSaving(true);
    const payload = {
      name: locationForm.name.trim(),
      type: locationForm.type,
      capacity: parseInt(locationForm.capacity) || 1,
      description: locationForm.description.trim() || null,
      is_active: locationForm.is_active,
    };
    let error;
    if (editingLocation) {
      const r = await supabase.from("locations").update(payload).eq("id", editingLocation.id);
      error = r.error;
    } else {
      const r = await supabase.from("locations").insert(payload);
      error = r.error;
    }
    if (error) { toast.error(error.message); }
    else { toast.success(editingLocation ? "Prostor upraven" : "Prostor vytvořen"); setLocationDialogOpen(false); loadData(); }
    setSaving(false);
  }

  // ── Stats ────────────────────────────────────────────────

  const activeServices = services.filter((s) => s.is_active).length;
  const activeCategories = categories.filter((c) => c.is_active).length;
  const activeLocations = locations.filter((l) => l.is_active).length;
  const avgPrice = services.length > 0 ? services.reduce((sum, s) => sum + s.price, 0) / services.length : 0;

  // ── Render ───────────────────────────────────────────────

  return (
    <RequirePermission permission="admin.settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Číselníky a nastavení</h1>
          <p className="text-sm text-muted-foreground">Správa služeb, kategorií a prostorů</p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-lagoon/10"><Package className="size-4 text-lagoon" /></div>
                <div>
                  <p className="text-2xl font-bold">{activeServices}</p>
                  <p className="text-xs text-muted-foreground">Aktivních služeb</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange/10"><Layers className="size-4 text-orange" /></div>
                <div>
                  <p className="text-2xl font-bold">{activeCategories}</p>
                  <p className="text-xs text-muted-foreground">Kategorií</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><MapPin className="size-4 text-blue-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{activeLocations}</p>
                  <p className="text-xs text-muted-foreground">Prostorů</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="size-4 text-green-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{Math.round(avgPrice).toLocaleString("cs-CZ")}</p>
                  <p className="text-xs text-muted-foreground">Průměrná cena (Kč)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">Služby ({activeServices})</TabsTrigger>
            <TabsTrigger value="categories">Kategorie ({activeCategories})</TabsTrigger>
            <TabsTrigger value="locations">Prostory ({activeLocations})</TabsTrigger>
          </TabsList>

          {/* ═══ SERVICES TAB ═══ */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="Všechny kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny kategorie</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch checked={showInactive} onCheckedChange={setShowInactive} />
                  <span className="text-xs text-muted-foreground">Neaktivní</span>
                </div>
              </div>
              <Button onClick={() => openServiceDialog()} className="bg-lagoon hover:bg-lagoon/90">
                <Plus className="size-4 mr-2" />Nová služba
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Služba</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead className="text-center">Délka</TableHead>
                      <TableHead className="text-right">Cena</TableHead>
                      <TableHead className="text-center">DPH</TableHead>
                      <TableHead className="text-center">Kapacita</TableHead>
                      <TableHead className="text-center">Stav</TableHead>
                      <TableHead className="w-24 text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Načítání...</TableCell></TableRow>
                    ) : filteredServices.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-12">
                        <Package className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Žádné služby</p>
                      </TableCell></TableRow>
                    ) : filteredServices.map((service) => (
                      <TableRow key={service.id} className={`hover:bg-muted/50 ${!service.is_active ? "opacity-50" : ""}`}>
                        <TableCell>
                          {service.color && (
                            <div className="size-3 rounded-full" style={{ backgroundColor: service.color }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">{service.name}</span>
                            {service.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[250px]">{service.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{getCategoryName(service.category_id)}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            {service.duration_minutes} min
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {service.price.toLocaleString("cs-CZ")} Kč
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {service.vat_rate}%
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="size-3 text-muted-foreground" />
                            {service.max_participants === 1 ? "1:1" : `1:${service.max_participants}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={service.is_active ? "default" : "secondary"}
                            className={`text-xs cursor-pointer ${service.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}`}
                            onClick={() => toggleServiceActive(service)}
                          >
                            {service.is_active ? "Aktivní" : "Neaktivní"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveService(service, "up")} title="Nahoru">
                              <ChevronUp className="size-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveService(service, "down")} title="Dolů">
                              <ChevronDown className="size-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openServiceDialog(service)}>
                              <Pencil className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ CATEGORIES TAB ═══ */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openCategoryDialog()} className="bg-lagoon hover:bg-lagoon/90">
                <Plus className="size-4 mr-2" />Nová kategorie
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const catServices = services.filter((s) => s.category_id === cat.id);
                const activeCount = catServices.filter((s) => s.is_active).length;
                return (
                  <Card key={cat.id} className={`${!cat.is_active ? "opacity-50" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{cat.name}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCategoryDialog(cat)}>
                          <Pencil className="size-3" />
                        </Button>
                      </div>
                      <CardDescription className="text-xs">
                        {getCategoryTypeName(cat.category)} · Pořadí: {cat.sort_order}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mb-2">{cat.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{activeCount} aktivních služeb</span>
                        <Badge variant={cat.is_active ? "default" : "secondary"} className="text-xs">
                          {cat.is_active ? "Aktivní" : "Neaktivní"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {categories.length === 0 && !loading && (
                <div className="col-span-full text-center py-12">
                  <Layers className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Žádné kategorie</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══ LOCATIONS TAB ═══ */}
          <TabsContent value="locations" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openLocationDialog()} className="bg-lagoon hover:bg-lagoon/90">
                <Plus className="size-4 mr-2" />Nový prostor
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Název</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-center">Kapacita</TableHead>
                      <TableHead>Popis</TableHead>
                      <TableHead className="text-center">Stav</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Načítání...</TableCell></TableRow>
                    ) : locations.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12">
                        <MapPin className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Žádné prostory</p>
                      </TableCell></TableRow>
                    ) : locations.map((loc) => (
                      <TableRow key={loc.id} className={`hover:bg-muted/50 ${!loc.is_active ? "opacity-50" : ""}`}>
                        <TableCell className="font-medium text-sm">{loc.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{getLocationTypeName(loc.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{loc.capacity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{loc.description || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={loc.is_active ? "default" : "secondary"}
                            className={`text-xs ${loc.is_active ? "bg-green-100 text-green-700" : ""}`}>
                            {loc.is_active ? "Aktivní" : "Neaktivní"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLocationDialog(loc)}>
                            <Pencil className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ═══ SERVICE DIALOG ═══ */}
        <Dialog open={serviceDialogOpen} onOpenChange={(o) => { if (!o) setServiceDialogOpen(false); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingService ? "Upravit službu" : "Nová služba"}</DialogTitle>
              <DialogDescription>Definujte parametry služby</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Název služby *</Label>
                <Input value={serviceForm.name} onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))} placeholder="Osobní trénink 60 min" />
              </div>
              <div className="space-y-2">
                <Label>Popis</Label>
                <Textarea value={serviceForm.description} onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Stručný popis služby..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={serviceForm.category_id} onValueChange={(v) => setServiceForm((f) => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Vyberte kategorii" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c) => c.is_active).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Barva (kalendář)</Label>
                  <Select value={serviceForm.color} onValueChange={(v) => setServiceForm((f) => ({ ...f, color: v }))}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full" style={{ backgroundColor: serviceForm.color }} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className="size-3 rounded-full" style={{ backgroundColor: c.value }} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Délka (min)</Label>
                  <Input type="number" value={serviceForm.duration_minutes} onChange={(e) => setServiceForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Cena (Kč)</Label>
                  <Input type="number" value={serviceForm.price} onChange={(e) => setServiceForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Sazba DPH</Label>
                  <Select value={serviceForm.vat_rate} onValueChange={(v) => setServiceForm((f) => ({ ...f, vat_rate: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VAT_RATES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Max. účastníků</Label>
                  <Input type="number" min="1" value={serviceForm.max_participants} onChange={(e) => setServiceForm((f) => ({ ...f, max_participants: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Pořadí řazení</Label>
                  <Input type="number" value={serviceForm.sort_order} onChange={(e) => setServiceForm((f) => ({ ...f, sort_order: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={serviceForm.is_active} onCheckedChange={(v) => setServiceForm((f) => ({ ...f, is_active: v }))} />
                  <Label>Aktivní</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={serviceForm.requires_equipment} onCheckedChange={(v) => setServiceForm((f) => ({ ...f, requires_equipment: v }))} />
                  <Label>Vyžaduje vybavení</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Zrušit</Button>
              <Button onClick={saveService} disabled={saving} className="bg-lagoon hover:bg-lagoon/90">
                {saving ? "Ukládám..." : editingService ? "Uložit změny" : "Vytvořit službu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ CATEGORY DIALOG ═══ */}
        <Dialog open={categoryDialogOpen} onOpenChange={(o) => { if (!o) setCategoryDialogOpen(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Upravit kategorii" : "Nová kategorie"}</DialogTitle>
              <DialogDescription>Kategorie seskupují služby</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Název *</Label>
                <Input value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} placeholder="Osobní trénink" />
              </div>
              <div className="space-y-2">
                <Label>Typ kategorie</Label>
                <Select value={categoryForm.category} onValueChange={(v) => setCategoryForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Popis</Label>
                <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Pořadí</Label>
                  <Input type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm((f) => ({ ...f, sort_order: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={categoryForm.is_active} onCheckedChange={(v) => setCategoryForm((f) => ({ ...f, is_active: v }))} />
                  <Label>Aktivní</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Zrušit</Button>
              <Button onClick={saveCategory} disabled={saving} className="bg-lagoon hover:bg-lagoon/90">
                {saving ? "Ukládám..." : editingCategory ? "Uložit" : "Vytvořit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ LOCATION DIALOG ═══ */}
        <Dialog open={locationDialogOpen} onOpenChange={(o) => { if (!o) setLocationDialogOpen(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Upravit prostor" : "Nový prostor"}</DialogTitle>
              <DialogDescription>Definujte parametry prostoru</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Název *</Label>
                <Input value={locationForm.name} onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))} placeholder="Sál A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select value={locationForm.type} onValueChange={(v) => setLocationForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kapacita</Label>
                  <Input type="number" min="1" value={locationForm.capacity} onChange={(e) => setLocationForm((f) => ({ ...f, capacity: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Popis</Label>
                <Textarea value={locationForm.description} onChange={(e) => setLocationForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Poznámky k prostoru..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={locationForm.is_active} onCheckedChange={(v) => setLocationForm((f) => ({ ...f, is_active: v }))} />
                <Label>Aktivní</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>Zrušit</Button>
              <Button onClick={saveLocation} disabled={saving} className="bg-lagoon hover:bg-lagoon/90">
                {saving ? "Ukládám..." : editingLocation ? "Uložit" : "Vytvořit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
