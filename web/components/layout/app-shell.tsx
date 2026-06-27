"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  User,
  Shirt,
  History,
  Store,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { authService } from "@/lib/api/auth.service";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/home", label: "Accueil", icon: Home },
  { href: "/avatar", label: "Mon Avatar", icon: User },
  { href: "/catalogue", label: "Catalogue", icon: Shirt },
  { href: "/tryon/history", label: "Mes essayages", icon: History },
];

const vendorNavItem = { href: "/vendor", label: "Vendeur", icon: Store };

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUnauthenticated } = useAuthStore();

  const items =
    user?.role === "vendeur" ? [...navItems, vendorNavItem] : navItems;

  async function handleLogout() {
    await authService.logout();
    setUnauthenticated();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      {/*  Sidebar desktop  */}
      <aside className="hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <SidebarContent
          items={items}
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      {/*  Sidebar mobile (overlay)  */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface">
            <SidebarContent
              items={items}
              pathname={pathname}
              user={user}
              onLogout={handleLogout}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/*  Contenu principal  */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
          <Link href="/home" className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary-600" />
            <span className="font-bold text-primary-600">VirtuFit</span>
          </Link>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="size-6" />
          </button>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  pathname,
  user,
  onLogout,
  onNavigate,
}: {
  items: { href: string; label: string; icon: typeof Home }[];
  pathname: string;
  user: { firstName: string; lastName: string; role: string } | null;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link href="/home" className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary-600" />
          <span className="font-bold text-primary-600">VirtuFit</span>
        </Link>
        {onNavigate && (
          <button onClick={onNavigate}>
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-text-secondary hover:bg-surface-muted",
              )}
            >
              <Icon className="size-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs capitalize text-text-muted">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface-muted"
          >
            <LogOut className="size-4" />
            Déconnexion
          </button>
        </div>
      )}
    </>
  );
}