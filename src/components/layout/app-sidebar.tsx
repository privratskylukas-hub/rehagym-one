"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Heart,
  CreditCard,
  Megaphone,
  BarChart3,
  Settings,
  Shield,
  UserCog,
  List,
  Dumbbell,
  Stethoscope,
  LogOut,
  TrendingUp,
  TrendingDown,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/components/shared/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  permissions?: string[]; // any of these
}

const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Klienti", href: "/clients", icon: Users, permission: "clients.read" },
  { title: "Rezervace", href: "/bookings", icon: CalendarDays, permission: "bookings.read" },
];

const healthNav: NavItem[] = [
  { title: "Zdravotní záznamy", href: "/health/medical", icon: Stethoscope, permissions: ["medical.read_own", "medical.read_all"] },
  { title: "Fyzioterapie", href: "/health/physio", icon: Heart, permissions: ["medical.read_own", "medical.read_all"] },
  { title: "Tréninkové plány", href: "/health/training", icon: Dumbbell, permissions: ["training.read_own", "training.read_all"] },
];

const businessNav: NavItem[] = [
  { title: "Finance", href: "/finance", icon: CreditCard, permission: "payments.read" },
  { title: "Marketing", href: "/marketing", icon: Megaphone, permission: "marketing.campaigns" },
  { title: "Reporty", href: "/reports", icon: BarChart3, permissions: ["reports.operational", "reports.financial"] },
];

const managementNav: NavItem[] = [
  { title: "Executive Dashboard", href: "/management", icon: BarChart3, permission: "management.dashboard" },
  { title: "Tržby", href: "/management/revenue", icon: TrendingUp, permission: "management.revenue" },
  { title: "Náklady", href: "/management/costs", icon: TrendingDown, permission: "management.costs" },
  { title: "Trenéři", href: "/management/providers", icon: Users, permission: "management.providers" },
];

const adminNav: NavItem[] = [
  { title: "Uživatelé", href: "/admin/users", icon: UserCog, permission: "admin.users" },
  { title: "Role a oprávnění", href: "/admin/roles", icon: Shield, permission: "admin.roles" },
  { title: "Číselníky", href: "/admin/settings", icon: List, permission: "admin.settings" },
  { title: "Nastavení", href: "/admin/system", icon: Settings, permission: "admin.settings" },
];

function NavGroup({
  label,
  items,
}: {
  label: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const { hasPermission, hasAnyPermission } = useAuth();

  const visibleItems = items.filter((item) => {
    if (!item.permission && !item.permissions) return true;
    if (item.permission) return hasPermission(item.permission);
    if (item.permissions) return hasAnyPermission(item.permissions);
    return false;
  });

  if (visibleItems.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname.startsWith(item.href)}
                render={<Link href={item.href} />}
              >
                <item.icon className="size-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/rehagym-logo.svg"
            alt="RehaGym"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div>
            <p className="font-bold text-sm tracking-tight">
              RehaGym <span className="text-primary">ONE</span>
            </p>
            <p className="text-[11px] text-muted-foreground tracking-wide">
              Provozní systém
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <NavGroup label="Hlavní" items={mainNav} />
        <NavGroup label="Zdravotní péče" items={healthNav} />
        <NavGroup label="Business" items={businessNav} />
        <NavGroup label="Vedení" items={managementNav} />
        <NavGroup label="Administrace" items={adminNav} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title={resolvedTheme === "dark" ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
        >
          {resolvedTheme === "dark" ? (
            <>
              <Sun className="size-3.5" />
              <span>Světlý režim</span>
            </>
          ) : (
            <>
              <Moon className="size-3.5" />
              <span>Tmavý režim</span>
            </>
          )}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.roles.map((r) => r.display_name).join(", ")}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Odhlásit se" className="text-muted-foreground hover:text-destructive">
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
