// @ts-nocheck — Supabase types will be auto-generated once connected
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, AuthState, Permission } from "@/types/auth";

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasRole: () => false,
  isSuperAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const loadUserProfile = useCallback(
    async (userId: string) => {
      try {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError || !profile) {
          console.error("[Auth] Profile load error:", profileError);
          setUser(null);
          setLoading(false);
          return;
        }

        // Fetch user's roles
        const { data: userRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role_id, roles(id, name, display_name)")
          .eq("user_id", userId);

        if (rolesError) {
          console.error("[Auth] Roles load error:", rolesError);
        }

        // Fetch role permissions
        const roleIds = userRoles?.map((ur) => ur.role_id) || [];
        let rolePermissions: { permissions: { code: string } }[] = [];
        if (roleIds.length > 0) {
          const { data: rp, error: rpError } = await supabase
            .from("role_permissions")
            .select("permissions(code)")
            .in("role_id", roleIds);
          if (rpError) {
            console.error("[Auth] Role permissions error:", rpError);
          }
          rolePermissions = rp || [];
        }

        // Fetch individual permission overrides
        const { data: userPermOverrides, error: upError } = await supabase
          .from("user_permissions")
          .select("granted, permissions(code)")
          .eq("user_id", userId);

        if (upError) {
          console.error("[Auth] User permissions error:", upError);
        }

        // Compute effective permissions
        const rolePerms = new Set(
          rolePermissions?.map((rp) => (rp.permissions as { code: string }).code) || []
        );

        // Apply overrides
        userPermOverrides?.forEach((override) => {
          const code = (override.permissions as { code: string }).code;
          if (override.granted) {
            rolePerms.add(code);
          } else {
            rolePerms.delete(code);
          }
        });

        const roles =
          userRoles?.map((ur) => ur.roles as { id: string; name: string; display_name: string }) || [];

        const permissionsArray = Array.from(rolePerms);
        console.log("[Auth] User loaded:", profile.full_name, "| Roles:", roles.map(r => r.name).join(", "), "| Permissions:", permissionsArray.length);

        setUser({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          status: profile.status as UserProfile["status"],
          job_title: profile.job_title,
          specialization: profile.specialization,
          roles,
          permissions: permissionsArray,
        });
      } catch (err) {
        console.error("[Auth] Unexpected error loading profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log("[Auth] Auth state change:", event);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Initial check
    supabase.auth.getUser().then(({ data: { user: authUser }, error }) => {
      if (!mounted) return;
      if (error) {
        console.error("[Auth] getUser error:", error);
        setLoading(false);
        return;
      }
      if (authUser) {
        console.log("[Auth] Initial user found:", authUser.email);
        loadUserProfile(authUser.id);
      } else {
        console.log("[Auth] No user session");
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadUserProfile]);

  const hasPermission = useCallback(
    (permission: Permission) => {
      if (!user) return false;
      if (user.permissions.includes("system.super_admin")) return true;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: Permission[]) => {
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const hasRole = useCallback(
    (roleName: string) => {
      if (!user) return false;
      return user.roles.some((r) => r.name === roleName);
    },
    [user]
  );

  const isSuperAdmin = hasPermission("system.super_admin");

  return (
    <AuthContext.Provider
      value={{ user, loading, hasPermission, hasAnyPermission, hasRole, isSuperAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
