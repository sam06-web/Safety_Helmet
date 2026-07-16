import { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { monitorApi, incidentsApi } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  UsersIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

/* ─── Animated Counter ──────────────────────────────────────────────────── */
function AnimatedCounter({ value, className = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === displayValue) return;
    const step = value > displayValue ? 1 : -1;
    const interval = setInterval(() => {
      setDisplayValue((prev) => {
        const next = prev + step;
        if ((step > 0 && next >= value) || (step < 0 && next <= value)) {
          clearInterval(interval);
          return value;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
function StatCard({ title, value, icon: Icon, gradient, pulse = false }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition-all duration-300 hover:scale-[1.02] hover:border-slate-700 ${pulse && value > 0 ? 'animate-pulse-emergency' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <AnimatedCounter value={value} className={`text-3xl font-bold mt-1 block bg-gradient-to-r ${gradient} bg-clip-text text-transparent`} />
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} opacity-10`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {/* Decorative gradient bar at bottom */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} opacity-40`} />
    </div>
  );
}

/* ─── Worker Card ───────────────────────────────────────────────────────── */
function WorkerCard({ worker }) {
  const statusColors = {
    safe: 'border-l-emerald-500',
    warning: 'border-l-amber-400',
    emergency: 'border-l-red-500',
    offline: 'border-l-slate-600',
  };
  const dotColors = {
    safe: 'bg-emerald-400',
    warning: 'bg-amber-400',
    emergency: 'bg-red-500 animate-pulse',
    offline: 'bg-slate-600',
  };

  return (
    <div className={`rounded-xl border border-slate-800 border-l-[3px] ${statusColors[worker.status] || statusColors.offline} bg-slate-900/60 p-3.5 hover:bg-slate-800/60 transition-all duration-200 cursor-default`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-sm font-semibold text-slate-300 flex-shrink-0">
              {worker.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${dotColors[worker.status] || dotColors.offline}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{worker.name || `Worker ${worker.id}`}</p>
            <p className="text-xs text-slate-500 truncate">{worker.department || 'Unassigned'}</p>
          </div>
        </div>
        <StatusBadge status={worker.status || 'offline'} />
      </div>
    </div>
  );
}

/* ─── Alert Item ────────────────────────────────────────────────────────── */
function AlertItem({ alert, onAcknowledge }) {
  const config = {
    emergency: { icon: ShieldExclamationIcon, color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/20' },
    warning: { icon: ExclamationTriangleIcon, color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/20' },
    info: { icon: BellAlertIcon, color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/20' },
  };

  const c = config[alert.severity] || config.info;
  const Icon = c.icon;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`p-3 rounded-xl ${c.bg} border ${c.border}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 ${c.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-200 truncate">
              {(alert.incident_type || alert.type || 'Alert').replace(/_/g, ' ')}
            </p>
            <span className="text-[10px] text-slate-500 flex-shrink-0 flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatTime(alert.timestamp || alert.created_at)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {alert.worker_name || 'Unknown worker'}
          </p>
          {!alert.acknowledged && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="mt-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Acknowledge →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Dashboard Page ════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { workers: wsWorkers, alerts: wsAlerts, dashboardData } = useWebSocket();
  const [apiDashboard, setApiDashboard] = useState(null);
  const [apiWorkers, setApiWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboard, monitorWorkers] = await Promise.all([
          monitorApi.getDashboard().catch(() => null),
          monitorApi.getMonitorWorkers().catch(() => []),
        ]);
        if (dashboard) setApiDashboard(dashboard);
        // Flatten the MonitorWorkerResponse objects into simple worker objects
        const flat = (monitorWorkers || []).map((mw) => ({
          id: mw.worker?.id,
          name: mw.worker?.name,
          department: mw.worker?.department,
          status: mw.worker?.status || 'offline',
          employee_id: mw.worker?.employee_id,
        }));
        setApiWorkers(flat);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Use WebSocket data if available, else fall back to REST API
  const workers = wsWorkers.length > 0 ? wsWorkers : apiWorkers;
  const alerts = wsAlerts.length > 0 ? wsAlerts : (apiDashboard?.recent_alerts || []);

  const stats = useMemo(() => {
    if (dashboardData) {
      return {
        online: dashboardData.workers_online || 0,
        safe: dashboardData.workers_safe || dashboardData.safe_count || 0,
        warning: dashboardData.workers_warning || dashboardData.warning_count || 0,
        emergency: dashboardData.workers_emergency || dashboardData.emergency_count || 0,
      };
    }
    if (apiDashboard) {
      return {
        online: apiDashboard.workers_online || 0,
        safe: apiDashboard.workers_safe || 0,
        warning: apiDashboard.workers_warning || 0,
        emergency: apiDashboard.workers_emergency || 0,
      };
    }
    return {
      online: workers.filter((w) => w.status !== 'offline').length,
      safe: workers.filter((w) => w.status === 'safe').length,
      warning: workers.filter((w) => w.status === 'warning').length,
      emergency: workers.filter((w) => w.status === 'emergency').length,
    };
  }, [dashboardData, apiDashboard, workers]);

  const filteredWorkers = useMemo(() => {
    if (!searchQuery) return workers;
    const q = searchQuery.toLowerCase();
    return workers.filter((w) =>
      (w.name && w.name.toLowerCase().includes(q)) ||
      (w.department && w.department.toLowerCase().includes(q)) ||
      (w.employee_id && w.employee_id.toLowerCase().includes(q))
    );
  }, [workers, searchQuery]);

  const handleAcknowledge = async (alertId) => {
    try {
      await incidentsApi.acknowledgeIncident(alertId);
    } catch (err) {
      console.error('Acknowledge error:', err);
    }
  };

  if (loading && workers.length === 0) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Workers Online" value={stats.online} icon={UsersIcon} gradient="from-blue-400 to-cyan-400" />
        <StatCard title="Safe" value={stats.safe} icon={ShieldCheckIcon} gradient="from-emerald-400 to-green-400" />
        <StatCard title="Warnings" value={stats.warning} icon={ExclamationTriangleIcon} gradient="from-amber-400 to-orange-400" />
        <StatCard title="Emergency" value={stats.emergency} icon={ShieldExclamationIcon} gradient="from-red-400 to-rose-500" pulse />
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Worker Status Grid (2/3) */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Worker Status</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {workers.length} total · {stats.online} online
              </p>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 py-1.5 text-sm w-48"
              />
            </div>
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {searchQuery ? 'No workers match your search' : 'No workers online'}
              </p>
              <p className="text-xs text-slate-600 mt-1">Workers will appear here when their helmets connect</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredWorkers.map((worker) => (
                <WorkerCard key={worker.id || worker.worker_id} worker={worker} />
              ))}
            </div>
          )}
        </div>

        {/* Active Alerts Panel (1/3) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Active Alerts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {alerts.filter((a) => !a.acknowledged).length} unacknowledged
              </p>
            </div>
            <BellAlertIcon className="w-5 h-5 text-slate-600" />
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircleIcon className="w-14 h-14 mx-auto text-emerald-500/20 mb-3" />
              <p className="text-sm font-medium text-emerald-400">All Clear</p>
              <p className="text-xs text-slate-500 mt-1">No active alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {alerts.slice(0, 15).map((alert, index) => (
                <AlertItem key={alert.id || index} alert={alert} onAcknowledge={handleAcknowledge} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
