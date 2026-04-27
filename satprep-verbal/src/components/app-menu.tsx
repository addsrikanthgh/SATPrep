"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStudent } from "@/lib/student-context";

const menuItems = [
  { href: "/", label: "Home" },
  { href: "/practice/meaning", label: "Meaning Quiz" },
  { href: "/practice/blanks", label: "Blank Quiz" },
  { href: "/practice/passages", label: "Passage Quiz" },
  { href: "/practice/progress", label: "Progress" },
  { href: "/practice/weak-words", label: "Weak Words" },
  { href: "/practice/data-management", label: "Data" },
];

export function AppMenu() {
  const pathname = usePathname();
  const { student, clearStudent } = useStudent();

  return (
    <div className="flex flex-col gap-2">
      {student ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{student.name}</span>
            <span className="ml-1 text-slate-400">({student.id})</span>
          </span>
          <button
            type="button"
            onClick={clearStudent}
            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
          >
            Switch
          </button>
        </div>
      ) : null}
      <nav aria-label="Main navigation" className="flex flex-wrap gap-1.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
