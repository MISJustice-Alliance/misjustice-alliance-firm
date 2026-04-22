import { Link, useLocation } from 'react-router-dom';
import { FilePlus, LayoutDashboard, Inbox, Shield } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Intake', icon: FilePlus },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/approvals', label: 'Approvals', icon: Inbox },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <span className="font-semibold text-sm tracking-wide">MISJustice Alliance</span>
          </div>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-10 flex items-center justify-between text-xs text-slate-500">
          <span>MISJustice Alliance Firm — Operator Portal</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Local inference mode
          </span>
        </div>
      </footer>
    </div>
  );
}
