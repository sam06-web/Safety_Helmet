import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Squares2X2Icon,
  UsersIcon,
  ShieldCheckIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Squares2X2Icon },
  { to: '/workers', label: 'Workers', icon: UsersIcon },
  { to: '/helmets', label: 'Helmets', icon: ShieldCheckIcon },
  { to: '/monitoring', label: 'Monitoring', icon: SignalIcon },
  { to: '/incidents', label: 'Incidents', icon: ExclamationTriangleIcon },
  { to: '/analytics', label: 'Analytics', icon: ChartBarIcon },
  { to: '/reports', label: 'Reports', icon: DocumentTextIcon },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <ShieldCheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">SafeGuard</h1>
            <p className="text-[10px] font-semibold text-cyan-400 tracking-[0.2em] uppercase">Pro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500/15 to-cyan-500/10 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="my-3 mx-3 border-t border-slate-800" />
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/15 to-cyan-500/10 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
              Settings
            </NavLink>
          </>
        )}
      </nav>

      {/* Connection Status Indicator */}
      <div className="mx-4 mb-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
          isConnected
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {isConnected ? 'System Online' : 'Disconnected'}
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.username || 'User'}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role || 'operator'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
