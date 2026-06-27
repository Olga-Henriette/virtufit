"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInitAuth } from "@/lib/hooks/use-init-auth";
import { useAuthStore } from "@/lib/store/auth.store";
import { FullPageSpinner } from "@/components/ui/spinner";

export default function RootPage() {
  const router = useRouter();
  const { isInitializing } = useInitAuth();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (isInitializing) return;
    router.replace(status === "authenticated" ? "/home" : "/login");
  }, [isInitializing, status, router]);

  return <FullPageSpinner label="Chargement de VirtuFit…" />;
}