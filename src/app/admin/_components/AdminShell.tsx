"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import {
  ChevronRight,
  LayoutDashboard,
  type LucideIcon,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Smartphone,
  Store,
  Tags,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type BreadcrumbItem = {
  href: string;
  label: string;
};

const navGroups: NavGroup[] = [
  {
    title: "Produk",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        isActive: (pathname) => pathname === "/admin",
      },
      {
        href: "/admin/produk",
        label: "Semua Produk",
        icon: Package,
        isActive: (pathname) => pathname.startsWith("/admin/produk") && !pathname.startsWith("/admin/produk/baru"),
      },
      {
        href: "/admin/produk/baru",
        label: "Tambah Produk",
        icon: PlusCircle,
        isActive: (pathname) => pathname.startsWith("/admin/produk/baru"),
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        href: "/admin/master-data/brands",
        label: "Brands",
        icon: Tags,
        isActive: (pathname) => pathname.startsWith("/admin/master-data/brands"),
      },
      {
        href: "/admin/master-data/marketplaces",
        label: "Marketplaces",
        icon: Store,
        isActive: (pathname) => pathname.startsWith("/admin/master-data/marketplaces"),
      },
    ],
  },
];

function toTitleCase(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function segmentToLabel(segment: string, previousSegment: string | null) {
  // Mapping nama route teknis -> label yang lebih ramah untuk breadcrumb.
  const dictionary: Record<string, string> = {
    produk: "Semua Produk",
    baru: "Tambah Produk",
    "master-data": "Master Data",
    brands: "Brands",
    marketplaces: "Marketplaces",
    login: "Login Admin",
    register: "Registrasi Admin",
  };

  if (dictionary[segment]) return dictionary[segment];
  if (previousSegment === "produk" && /^\d+$/.test(segment)) return `Produk #${segment}`;
  return toTitleCase(decodeURIComponent(segment));
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const base = (name?.trim() || email?.trim() || "Admin").replace(/\s+/g, " ");
  const parts = base.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "admin") return [{ href: "/admin", label: "Dashboard" }];

  const crumbs: BreadcrumbItem[] = [{ href: "/admin", label: "Dashboard" }];
  let currentPath = "/admin";

  const adminSegments = segments.slice(1);
  for (let index = 0; index < adminSegments.length; index += 1) {
    const segment = adminSegments[index] ?? "";
    currentPath = `${currentPath}/${segment}`;
    crumbs.push({
      href: currentPath,
      label: segmentToLabel(segment, adminSegments[index - 1] ?? null),
    });
  }

  return crumbs;
}

export function AdminShell({ children, userName, userEmail }: AdminShellProps) {
  const pathname = usePathname();
  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const initials = useMemo(() => getInitials(userName, userEmail), [userName, userEmail]);
  const isAuthRoute = pathname.startsWith("/admin/login") || pathname.startsWith("/admin/register");

  const handleLogout = () => {
    void signOut({ callbackUrl: "/admin/login" });
  };

  if (isAuthRoute) {
    // Halaman login/register memakai layout minimal agar fokus ke form auth.
    return (
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <Smartphone className="h-4 w-4" />
              </span>
              CekHarga Admin
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Kembali ke Publik</Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 flex-col border-r bg-white md:flex">
        <div className="border-b px-5 py-5">
          <Link href="/admin" className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Smartphone className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-900">CekHarga Admin</span>
              <span className="block text-xs text-zinc-500">Control Center</span>
            </span>
          </Link>
        </div>

        <nav className="space-y-4 px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">{group.title}</p>
              {group.items.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-indigo-50 font-medium text-indigo-700"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon-sm" className="md:hidden">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Buka menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  {/* Menu mobile dalam Sheet (hamburger). */}
                  <SheetHeader className="border-b px-4 py-4 text-left">
                    <SheetTitle className="text-base">CekHarga Admin</SheetTitle>
                  </SheetHeader>
                  <nav className="space-y-4 px-3 py-4">
                    {navGroups.map((group) => (
                      <div key={group.title} className="space-y-1">
                        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          {group.title}
                        </p>
                        {group.items.map((item) => {
                          const active = item.isActive(pathname);
                          const Icon = item.icon;
                          return (
                            <SheetClose asChild key={item.href}>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                  active
                                    ? "bg-indigo-50 font-medium text-indigo-700"
                                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            </SheetClose>
                          );
                        })}
                      </div>
                    ))}
                  </nav>
                  <div className="mt-auto border-t p-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-zinc-400">Admin Panel</p>
                {/* Breadcrumb otomatis dari URL saat ini. */}
                <div className="flex items-center gap-1 overflow-hidden text-xs text-zinc-500 md:text-sm">
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <span key={crumb.href} className="inline-flex min-w-0 items-center gap-1">
                        {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" /> : null}
                        {isLast ? (
                          <span className="truncate font-medium text-zinc-900">{crumb.label}</span>
                        ) : (
                          <Link href={crumb.href} className="truncate hover:text-zinc-900 hover:underline">
                            {crumb.label}
                          </Link>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <details className="relative [&_summary::-webkit-details-marker]:hidden">
              {/* Dropdown profil sederhana: info user + tombol logout. */}
              <summary className="flex list-none cursor-pointer items-center gap-3 rounded-full border bg-white px-2 py-1.5 shadow-sm transition-colors hover:bg-zinc-50">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block max-w-40 truncate text-sm font-medium text-zinc-900">{userName ?? "Admin"}</span>
                  <span className="block max-w-40 truncate text-xs text-zinc-500">{userEmail ?? "admin@localhost"}</span>
                </span>
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white p-2 shadow-md">
                <p className="truncate px-2 pb-2 text-xs text-zinc-500">{userEmail ?? "admin@localhost"}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </details>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
