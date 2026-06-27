"use client";

import Link from "next/link";
import { Search, History, BarChart3, UserPlus, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { Card } from "@/components/ui/card";

const quickActions = [
  {
    href: "/avatar",
    label: "Créer mon avatar",
    icon: UserPlus,
    color: "bg-primary-50 text-primary-700",
  },
  {
    href: "/catalogue",
    label: "Parcourir le catalogue",
    icon: Search,
    color: "bg-secondary-50 text-secondary-700",
  },
  {
    href: "/tryon/history",
    label: "Mes essayages",
    icon: History,
    color: "bg-amber-50 text-amber-700",
  },
  {
    href: "/vendor",
    label: "Mes statistiques",
    icon: BarChart3,
    color: "bg-rose-50 text-rose-700",
  },
];

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 rounded-xl bg-linear-to-br from-primary-100 to-secondary-100 p-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Bonjour{user ? `, ${user.firstName}` : ""} 👋
        </h1>
        <p className="mt-2 text-text-secondary">
          Prêt à essayer de nouveaux vêtements ?
        </p>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        Actions rapides
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickActions.map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href}>
            <Card
              className={`flex h-32 flex-col items-center justify-center gap-3 text-center transition-shadow hover:shadow-md ${color}`}
            >
              <Icon className="size-7" />
              <span className="text-sm font-medium">{label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 mt-8 text-lg font-semibold text-text-primary">
        Statut du système
      </h2>
      <div className="space-y-2">
        <StatusRow label="Backend API" />
        <StatusRow label="AI Services" />
      </div>
    </div>
  );
}

function StatusRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        <CheckCircle2 className="size-3.5" />
        Connecté
      </span>
    </div>
  );
}