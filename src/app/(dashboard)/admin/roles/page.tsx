// @ts-nocheck — Supabase types will be auto-generated once connected
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus, Shield } from "lucide-react";
import { toast } from "sonner";

interface Permission {
  id: string;
  code: string;
  module: string;
  action: string;
  display_name: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[]; // permission IDs
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState({
    name: "",
    display_name: "",
    description: "",
    selectedPermissions: [] as string[],
  });

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);

    const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
      supabase.from("roles").select("*").order("display_name"),
      supabase.from("permissions").select("*").order("module, action"),
      supabase.from("role_permissions").select("role_id, permission_id"),
    ]);

    const rolesData = rolesRes.data || [];
    const rolePermsData = rolePermsRes.data || [];
    const rolesWithPerms = rolesData.map((r: { id: string; name: string; display_name: string; description: string | null; is_system: boolean }) => ({
      ...r,
      permissions: rolePermsData
        .filter((rp: { role_id: string; permission_id: string }) => rp.role_id === r.id)
        .map((rp: { role_id: string; permission_id: string }) => rp.permission_id),
    }));

    setRoles(rolesWithPerms);
    setPermissions(permsRes.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEditDialog(role: Role) {
    setEditingRole(role);
    setForm({
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
      selectedPermissions: role.permissions,
    });
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingRole(null);
    setForm({
      name: "",
      display_name: "",
      description: "",
      selectedPermissions: [],
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.display_name) {
      toast.error("Vyplňte název role");
      return;
    }

    if (editingRole) {
      // Update role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("roles") as any)
        .update({
          display_name: form.display_name,
          description: form.description || null,
        })
        .eq("id", editingRole.id);

      if (error) {
        toast.error("Chyba: " + error.message);
        return;
      }

      // Update permissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("role_permissions") as any).delete().eq("role_id", editingRole.id);
      if (form.selectedPermissions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("role_permissions") as any).insert(
          form.selectedPermissions.map((permId) => ({
            role_id: editingRole.id,
            permission_id: permId,
          }))
        );
      }

      toast.success("Role upravena");
    } else {
      // Create new role
      const name = form.display_name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newRole, error } = await (supabase.from("roles") as any)
        .insert({
          name,
          display_name: form.display_name,
          description: form.description || null,
          is_system: false,
        })
        .select()
        .single();

      if (error || !newRole) {
        toast.error("Chyba: " + (error?.message || "Neznámá chyba"));
        return;
      }

      if (form.selectedPermissions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("role_permissions") as any).insert(
          form.selectedPermissions.map((permId: string) => ({
            role_id: newRole.id,
            permission_id: permId,
          }))
        );
      }

      toast.success("Role vytvořena");
    }

    setDialogOpen(false);
    loadData();
  }

  function togglePermission(permId: string) {
    setForm((prev) => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permId)
        ? prev.selectedPermissions.filter((p) => p !== permId)
        : [...prev.selectedPermissions, permId],
    }));
  }

  // Group permissions by module
  const permissionsByModule = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  const moduleLabels: Record<string, string> = {
    clients: "Klienti",
    bookings: "Rezervace",
    medical: "Zdravotní záznamy",
    training: "Trénink",
    payments: "Platby",
    invoices: "Fakturace",
    marketing: "Marketing",
    reports: "Reporty",
    admin: "Administrace",
    system: "Systém",
  };

  return (
    <RequirePermission permission="admin.roles">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Role a oprávnění</h1>
            <p className="text-muted-foreground">
              Definice rolí a přiřazení oprávnění
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="size-4 mr-2" />
            Nová role
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Načítání...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="size-4" />
                      {role.display_name}
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          Systémová
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {role.description || "Bez popisu"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(role)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {role.permissions.length} oprávnění
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? `Upravit roli: ${editingRole.display_name}` : "Nová role"}
              </DialogTitle>
              <DialogDescription>
                Nastavte název a oprávnění pro tuto roli.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Název role *</Label>
                  <Input
                    value={form.display_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, display_name: e.target.value }))
                    }
                    placeholder="Např. Hlavní trenér"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Popis</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Volitelný popis role"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base">Oprávnění</Label>
                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {moduleLabels[module] || module}
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 text-sm"
                        >
                          <Checkbox
                            checked={form.selectedPermissions.includes(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <span>{perm.display_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={handleSave}>
                {editingRole ? "Uložit změny" : "Vytvořit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
