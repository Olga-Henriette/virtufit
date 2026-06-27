"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInitAuth } from "@/lib/hooks/use-init-auth";
import { useAuthStore } from "@/lib/store/auth.store";
import { AppShell } from "@/components/layout/app-shell";
import { FullPageSpinner } from "@/components/ui/spinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isInitializing } = useInitAuth();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!isInitializing && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [isInitializing, status, router]);

  if (isInitializing || status !== "authenticated") {
    return <FullPageSpinner label="Vérification de la session…" />;
  }

  return <AppShell>{children}</AppShell>;
}