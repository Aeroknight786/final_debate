"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/chat", label: "Debate", icon: "chat" },
  { href: "/roadmap", label: "Journey", icon: "roadmap" },
  { href: "/beliefs", label: "Beliefs", icon: "beliefs" },
  { href: "/learnings", label: "Learnings", icon: "learnings" },
];

function NavIcon({ type }: { type: string }) {
  switch (type) {
    case "chat":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "roadmap":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "beliefs":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "learnings":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    default:
      return null;
  }
}

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-56 border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-sm font-semibold tracking-wide" style={{ color: "var(--accent)" }}>
          FINAL DEBATE
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          about smoking
        </p>
      </div>

      <div className="flex-1 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? "font-medium"
                  : "hover:bg-[var(--surface-alt)]"
              }`}
              style={{
                color: isActive ? "var(--accent)" : "var(--foreground)",
                background: isActive ? "var(--surface-alt)" : undefined,
              }}
            >
              <NavIcon type={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-5 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        A debate-based cessation program
      </div>
    </nav>
  );
}
