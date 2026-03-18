// @ts-nocheck — Supabase types will be auto-generated once connected
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: string;
  job_title: string | null;
  roles: { id: string; name: string; display_name: string }[];
}

interface Role {
  id: string;
  name: string;
  display_name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    job_title: "",
    password: "",
    status: "active" as string,
    selectedRoles: [] as string[],
  });

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .order("full_name");

    const { data: rolesData } = await supabase
      .from("roles")
      .select("*")
      .order("display_name");

    // Load user roles
    const { data: userRolesData } = await supabase
      .from("user_roles")
      .select("user_id, role_id, roles(id, name, display_name)");

    const usersWithRoles = (usersData || []).map((u) => ({
      ...u,
      roles: (userRolesData || [])
        .filter((ur) => ur.user_id === u.id)
        .map((ur) => ur.roles as { id: string; name: string; display_name: string }),
    }));

    setUsers(usersWithRoles);
    setRoles(rolesData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateDialog() {
    setEditingUser(null);
    setForm({
      email: "",
      full_name: "",
      phone: "",
      job_title: "",
      password: "",
      status: "active",
      selectedRoles: [],
    });
    setDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUser(user);
    setForm({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || "",
      job_title: user.job_title || "",
      password: "",
      status: user.status,
      selectedRoles: user.roles.map((r) => r.id),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.email || !form.full_name) {
      toast.error("Vyplňte e-mail a jméno");
      return;
    }

    if (editingUser) {
      // Update existing user
      const { error } = await supabase
        .from("users")
        .update({
          full_name: form.full_name,
          phone: form.phone || null,
          job_title: form.job_title || null,
          status: form.status as "active" | "inactive" | "suspended",
        })
        .eq("id", editingUser.id);

      if (error) {
        toast.error("Chyba při ukládání: " + error.message);
        return;
      }

      // Update roles - delete existing and insert new
      await supabase.from("user_roles").delete().eq("user_id", editingUser.id);
      if (form.selectedRoles.length > 0) {
        await supabase.from("user_roles").insert(
          form.selectedRoles.map((roleId) => ({
            user_id: editingUser.id,
            role_id: roleId,
          }))
        );
      }

      toast.success("Uživatel upraven");
    } else {
      // Create new user via API (needs service role for auth.users)
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          job_title: form.job_title,
          roles: form.selectedRoles,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error("Chyba: " + result.error);
        return;
      }

      toast.success("Uživatel vytvořen");
    }

    setDialogOpen(false);
    loadData();
  }

  function toggleRole(roleId: string) {
    setForm((prev) => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(roleId)
        ? prev.selectedRoles.filter((r) => r !== roleId)
        : [...prev.selectedRoles, roleId],
    }));
  }

  const statusColors: Record<string, string> = {
    active: "default",
    inactive: "secondary",
    suspended: "destructive",
  };

  const statusLabels: Record<string, string> = {
    active: "Aktivní",
    inactive: "Neaktivní",
    suspended: "Pozastavený",
  };

  return (
    <RequirePermission permission="admin.users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Správa uživatelů</h1>
            <p className="text-muted-foreground">
              Zakládání a správa uživatelských účtů zaměstnanců
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="size-4 mr-2" />
                Nový uživatel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Upravit uživatele" : "Nový uživatel"}
                </DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? "Upravte údaje uživatele a jeho role."
                    : "Vytvořte nový uživatelský účet pro zaměstnance."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Jméno a příjmení *</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, full_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      disabled={!!editingUser}
                    />
                  </div>
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Heslo *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Pozice</Label>
                    <Input
                      id="job_title"
                      value={form.job_title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, job_title: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {editingUser && (
                  <div className="space-y-2">
                    <Label>Stav</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktivní</SelectItem>
                        <SelectItem value="inactive">Neaktivní</SelectItem>
                        <SelectItem value="suspended">Pozastavený</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={form.selectedRoles.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        <span className="text-sm">{role.display_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Zrušit
                </Button>
                <Button onClick={handleSave}>
                  {editingUser ? "Uložit změny" : "Vytvořit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jméno</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Pozice</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Načítání...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Žádní uživatelé. Propojte Supabase a vytvořte prvního uživatele.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.job_title || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <Badge key={role.id} variant="outline" className="text-xs">
                            {role.display_name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[user.status] as "default" | "secondary" | "destructive"}>
                        {statusLabels[user.status] || user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(user)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </RequirePermission>
  );
}
