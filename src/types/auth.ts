export type Permission = string;

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: "active" | "inactive" | "suspended";
  job_title: string | null;
  specialization: string | null;
  roles: {
    id: string;
    name: string;
    display_name: string;
  }[];
  permissions: Permission[];
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasRole: (roleName: string) => boolean;
  isSuperAdmin: boolean;
}
