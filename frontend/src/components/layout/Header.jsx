import { useLocation } from 'react-router-dom';
import { BellIcon, SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '../../context/WebSocketContext';
import { useAuth } from '../../context/AuthContext';

const pageTitles = {
  '/': 'Dashboard',
  '/workers': 'Worker Management',
  '/helmets': 'Helmet Registry',
  '/monitoring': 'Live Monitoring',
  '/incidents': 'Incident Timeline',
  '/analytics': 'Analytics & Insights',
  '/reports': 'Reports',
  '/settings': 'System Settings',
};

export default function Header() {
  const location = useLocation();
  const { isConnected, alerts } = useWebSocket();
  const { user } = useAuth();

  const title = pageTitles[location.pathname] || 'SafeGuard Pro';
  const unreadAlerts = (alerts || []).filter((a) => !a.acknowledged).length;

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/60 flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400'
          }`}
        >
          {isConnected ? (
            <SignalIcon className="w-3.5 h-3.5" />
          ) : (
            <SignalSlashIcon className="w-3.5 h-3.5" />
          )}
          {isConnected ? 'Live' : 'Offline'}
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
          <BellIcon className="w-5 h-5" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {unreadAlerts > 9 ? '9+' : unreadAlerts}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-lg">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-slate-200">{user?.username || 'User'}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role || 'operator'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
