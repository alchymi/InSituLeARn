import { type PropsWithChildren } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import { Logo } from './index';

export function AppShell({ children }: PropsWithChildren) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-full flex bg-base">
      <aside className="w-56 shrink-0 border-r border-white/[0.06] p-4 flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-2 py-1.5 mb-6">
          <Logo size={28} />
          <span className="font-semibold text-[13px]">InSitu AR</span>
        </Link>

        <nav className="space-y-0.5 flex-1">
          <NavItem to="/" icon={GridIcon}>Mes quêtes</NavItem>
          <NavItem to="/medias" icon={ImageIcon} disabled>Médias</NavItem>
          <NavItem to="/settings" icon={GearIcon} disabled>Paramètres</NavItem>
        </nav>

        <div className="rounded-lg p-2.5 hover:bg-white/[0.04] flex items-center gap-2 cursor-pointer" onClick={handleLogout} title="Se déconnecter">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-[11px] font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate">{user?.name || user?.email}</p>
            <p className="text-[10px] text-zinc-500">Cliquer pour déconnecter</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: (p: { className?: string }) => JSX.Element;
  children: React.ReactNode;
  disabled?: boolean;
}

function NavItem({ to, icon: Icon, children, disabled }: NavItemProps) {
  if (disabled) {
    return (
      <span className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-zinc-600 cursor-not-allowed">
        <Icon className="w-4 h-4" />
        {children}
        <span className="ml-auto text-[9px] uppercase tracking-wider text-zinc-700">soon</span>
      </span>
    );
  }
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
          isActive ? 'bg-white/[0.06] text-zinc-100 font-medium' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {children}
    </NavLink>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
