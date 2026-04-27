"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useStudent } from "@/lib/student-context";

type MenuItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M6 4.5A2.5 2.5 0 018.5 2H18v18H8.5A2.5 2.5 0 016 17.5v-13z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 17.5A2.5 2.5 0 018.5 15H18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="6" y="11" width="2.6" height="6" rx="1" fill="currentColor" />
      <rect x="10.7" y="8" width="2.6" height="9" rx="1" fill="currentColor" />
      <rect x="15.4" y="5" width="2.6" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 21a6 6 0 006-6c0-4.1-2.8-5.5-4.1-8.4-.5 1.7-1.6 2.8-3.1 3.6.1-2.2-.9-3.8-2.8-5.2C7.3 8 6 9.8 6 12a6 6 0 006 9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="6.5" ry="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 6v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 11v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const sections: MenuSection[] = [
  {
    title: "Verbal Practice",
    items: [
      { href: "/practice/meaning", label: "Meaning Quiz", icon: <BookIcon /> },
      { href: "/practice/blanks", label: "Blank Quiz", icon: <BookIcon /> },
      { href: "/practice/passages", label: "Passage Quiz", icon: <BookIcon /> },
    ],
  },
  {
    title: "Progress",
    items: [{ href: "/practice/progress", label: "Performance", icon: <ChartIcon /> }],
  },
  {
    title: "Weak Words",
    items: [{ href: "/practice/weak-words", label: "Word Focus", icon: <FireIcon /> }],
  },
  {
    title: "Data",
    items: [{ href: "/practice/data-management", label: "Data Management", icon: <DatabaseIcon /> }],
  },
];

type AppMenuProps = {
  onNavigate?: () => void;
};

export function AppMenu({ onNavigate }: AppMenuProps) {
  const pathname = usePathname();
  const {
    student, clearStudent,
    adminUnlocked, adminUnlocking, adminPassword, adminError,
    adminStudents, viewingStudentId,
    setAdminPassword, setAdminError, setViewingStudentId,
    handleAdminUnlock, handleAdminLock,
  } = useStudent();
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  function openAdminModal() {
    setAdminError("");
    setAdminModalOpen(true);
  }

  function closeAdminModal() {
    setAdminModalOpen(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Link
        href="/"
        onClick={onNavigate}
        className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
          pathname === "/" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold">S</span>
        Home
      </Link>

      {student ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          {adminUnlocked ? (
            <>
              <p className="truncate text-xs font-semibold text-amber-700">Admin Mode</p>
              <select
                className="mt-1 w-full rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-slate-800"
                value={viewingStudentId}
                onChange={(e) => setViewingStudentId(e.target.value)}
              >
                {adminStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? s.email ?? s.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAdminLock}
                className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition-all duration-150 hover:bg-amber-100"
              >
                Exit Admin
              </button>
            </>
          ) : (
            <>
              <p className="truncate text-xs font-semibold text-slate-700">{student.name}</p>
              <p className="truncate text-xs text-slate-500">{student.id}</p>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={clearStudent}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-all duration-150 hover:bg-slate-100"
                >
                  Switch Student
                </button>
                <button
                  type="button"
                  onClick={openAdminModal}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition-all duration-150 hover:bg-slate-100"
                  title="Admin view"
                >
                  Admin
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Admin password modal */}
      {adminModalOpen && !adminUnlocked ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeAdminModal}
        >
          <div
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-slate-800">Admin Access</h2>
            <p className="mt-0.5 text-xs text-slate-500">Enter the admin passcode to view any student&apos;s performance.</p>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Passcode"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdminUnlock().then(closeAdminModal); }}
              className="mt-3 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            {adminError ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">{adminError}</p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAdminModal}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adminUnlocking || adminPassword.length === 0}
                onClick={() => void handleAdminUnlock().then(() => { if (!adminError) closeAdminModal(); })}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {adminUnlocking ? "Checking…" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav aria-label="Main navigation" className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className={isActive ? "text-blue-500" : "text-slate-400"}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
