"use client";

import { useAuth } from "@/lib/auth-context";
import type { Permission } from "@/types/auth";

interface RequirePermissionProps {
  permission?: Permission;
  permissions?: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequirePermission({
  permission,
  permissions,
  children,
  fallback,
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Načítání...</p>
        </div>
      </div>
    );
  }

  const allowed = permission
    ? hasPermission(permission)
    : permissions
      ? hasAnyPermission(permissions)
      : true;

  if (!allowed) {
    return fallback ? <>{fallback}</> : (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Přístup odepřen</h2>
          <p className="text-muted-foreground mt-2">
            Nemáte oprávnění pro zobrazení této stránky.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
