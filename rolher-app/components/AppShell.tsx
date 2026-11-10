'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CalendarClock, Car, LayoutDashboard, PlusCircle, type LucideIcon } from 'lucide-react';

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/carga', label: 'Carga', icon: PlusCircle },
  { href: '/cuotas', label: 'Cuotas', icon: CalendarClock },
  { href: '/flota', label: 'Flota', icon: Car },
];

const activo = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">R</span>
            <span className="text-base font-semibold tracking-tight">RolHer</span>
          </Link>
          <nav className="hidden gap-1 sm:flex" aria-label="Principal">
            {NAV.map(({ href, label, icon: Icon }) => {
              const on = activo(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
                    on ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="pb-safe-nav mx-auto max-w-6xl px-4 pt-5 sm:pb-10">{children}</main>

      {/* Barra inferior móvil */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur sm:hidden"
        aria-label="Principal"
      >
        <ul className="grid grid-cols-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = activo(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                    on ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={on ? 2.4 : 2} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
