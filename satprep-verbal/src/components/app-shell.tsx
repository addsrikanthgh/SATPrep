"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { AppMenu } from "@/components/app-menu";

type AppShellProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  headerIcon?: ReactNode;
  maxWidthClassName?: string;
  children: ReactNode;
};

type TopNavItem = {
  href: string;
  label: string;
};

const topNavItems: TopNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/practice/meaning", label: "Verbal" },
  { href: "/practice/ap-csp", label: "AP CSP" },
  { href: "/practice/passages", label: "Practice" },
  { href: "/practice/progress", label: "Progress" },
  { href: "/practice/data-management", label: "Data" },
  { href: "/practice/blanks", label: "Math" },
];

function MenuIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function isNavActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

export function AppShell({
  title,
  subtitle,
  eyebrow,
  headerIcon,
  maxWidthClassName = "max-w-5xl",
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initials = useMemo(() => "SP", []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-all duration-150 hover:bg-slate-100 lg:hidden"
            aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
          >
            {drawerOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-sm">
              S
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide text-slate-900">SAT PREP</p>
            </div>
          </div>

          <nav className="mx-auto hidden items-center gap-1 md:flex">
            {topNavItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {initials}
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 md:block"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <aside className="sticky top-20 hidden h-fit w-60 shrink-0 lg:block">
          <AppMenu />
        </aside>

        <main className={`min-w-0 flex-1 ${maxWidthClassName}`}>
          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {eyebrow ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{eyebrow}</p>
            ) : null}
            <div className="flex items-start gap-3">
              {headerIcon ? (
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  {headerIcon}
                </div>
              ) : null}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
                {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}
              </div>
            </div>
          </section>

          {children}
        </main>
      </div>

      {drawerOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close mobile navigation backdrop"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl lg:hidden">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold tracking-wide text-slate-900">SAT PREP</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label="Close mobile navigation"
              >
                <CloseIcon />
              </button>
            </div>
            <AppMenu onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      ) : null}
    </div>
  );
}
