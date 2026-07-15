"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";
import type { UserRole } from "@/lib/types";

interface RoleGuardProps {
  role: UserRole;
  children: ReactNode;
}

/**
 * Client-side role gate for the Supplier/Admin portals. Waits for the auth
 * hydration check before deciding, then redirects anyone without the
 * required role — a signed-out visitor to "/", a Buyer (or wrong-role user)
 * to their own "/dashboard".
 */
export function RoleGuard({ role, children }: RoleGuardProps) {
  const { user, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.role !== role) {
      router.replace("/dashboard");
    }
  }, [isHydrated, user, role, router]);

  if (!isHydrated || !user || user.role !== role) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-oceanic border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
