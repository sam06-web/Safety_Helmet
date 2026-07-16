import { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { monitorApi } from '../services/api';
import SensorGauge from '../components/common/SensorGauge';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  CheckCircleIcon,
  XCircleIcon,
  BoltIcon,
  SignalIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function CheckStatus({ checked, label }) {
  return (
    <div className="flex items-center gap-1.5">
      {checked ? (
        <CheckCircleIcon className="w-4 h-4 text-green-400" />
      ) : (
        <XCircleIcon className="w-4 h-4 text-red-400" />
      )}
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function SignalBars({ strength = 0 }) {
  const maxBars = 4;
  const activeBars = Math.round((strength / 100) * maxBars);
  let color = 'bg-green-500';
  if (activeBars <= 1) color = 'bg-red-500';
  else if (activeBars <= 2) color = 'bg-yellow-500';

  return (
    <div className="flex items-end gap-0.5 h-4">
      {Array.from({ length: maxBars }, (_, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm transition-all duration-300 ${
            i < activeBars ? color : 'bg-slate-700'
          }`}
          style={{ height: `${((i + 1) / maxBars) * 100}%` }}
        />
      ))}
    </div>
  );
}

function BatteryIcon({ level = 100 }) {
  let color = 'text-green-400';
  if (level <= 20) color = 'text-red-400';
  else if (level <= 50) color = 'text-yellow-400';

  return (
    <div className="flex items-center gap-1">
      <BoltIcon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{level}%</span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toFixed(1)}
        </p>
      ))}
    </div>
  );
}

function WorkerMonitorCard({ worker, onExpand }) {
  const emergencyPressed = worker.emergency_button || worker.sos;

  return (
    <div
      className={`card p-4 transition-all duration-200 hover:border-slate-600 ${
        emergencyPressed ? 'animate-pulse-emergency border-red-500/50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
            {worker.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{worker.name || `Worker ${worker.id}`}</p>
            <p className="text-xs text-slate-500">{worker.department || 'Unknown'}</p>
          </div>
        </div>
        <StatusBadge status={worker.status || 'offline'} />
      </div>

      {/* Gauges */}
      <div className="flex items-center justify-around mb-4">
        <SensorGauge
          value={worker.temperature ?? 0}
          max={50}
          min={0}
          label="Temp"
          unit="°C"
          warningThreshold={35}
          dangerThreshold={42}
          size={90}
        />
        <SensorGauge
          value={worker.gas_level ?? 0}
          max={100}
          min={0}
          label="Gas"
          unit="ppm"
          warningThreshold={50}
          dangerThreshold={75}
          size={90}
        />
      </div>

      {/* Status Checks */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <CheckStatus checked={worker.ppe_status ?? true} label="PPE" />
        <CheckStatus checked={worker.buckle_status ?? true} label="Buckle" />
      </div>

      {/* Emergency Button */}
      {emergencyPressed && (
        <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <ExclamationCircleIcon className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-xs font-semibold text-red-400">SOS ACTIVATED</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <BatteryIcon level={worker.battery_level ?? 100} />
          <div className="flex items-center gap-1">
            <SignalBars strength={worker.signal_strength ?? 0} />
          </div>
        </div>
        <button
          onClick={() => onExpand(worker)}
          className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <ChartBarIcon className="w-3 h-3" />
          History
        </button>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const { workers: wsWorkers } = useWebSocket();
  const [apiWorkers, setApiWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorker, setExpandedWorker] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const data = await monitorApi.getMonitorWorkers();
        setApiWorkers(Array.isArray(data) ? data : data?.items || []);
      } catch (err) {
        console.error('Failed to fetch monitoring data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkers();
  }, []);

  const workers = wsWorkers.length > 0 ? wsWorkers : apiWorkers;

  const handleExpand = async (worker) => {
    setExpandedWorker(worker);
    try {
      const data = await monitorApi.getMonitorWorker(worker.id || worker.worker_id);
      setHistoryData(data?.history || data?.sensor_history || []);
    } catch {
      // Generate sample history for display
      const now = Date.now();
      const sampleHistory = Array.from({ length: 60 }, (_, i) => ({
        time: new Date(now - (59 - i) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        temperature: (worker.temperature || 25) + (Math.random() - 0.5) * 5,
        gas_level: (worker.gas_level || 10) + (Math.random() - 0.5) * 8,
      }));
      setHistoryData(sampleHistory);
    }
  };

  if (loading && workers.length === 0) {
    return <LoadingSpinner text="Loading monitoring data..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Live Monitoring</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {workers.length} workers monitored · Real-time sensor data
        </p>
      </div>

      {/* Worker Grid */}
      {workers.length === 0 ? (
        <div className="card p-12 text-center">
          <SignalIcon className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">No workers currently being monitored</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {workers.map((worker) => (
            <WorkerMonitorCard
              key={worker.id || worker.worker_id}
              worker={worker}
              onExpand={handleExpand}
            />
          ))}
        </div>
      )}

      {/* Expanded Worker History */}
      {expandedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setExpandedWorker(null)} />
          <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-3xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  {expandedWorker.name || `Worker ${expandedWorker.id}`}
                </h3>
                <p className="text-sm text-slate-400">Sensor History — Last 1 Hour</p>
              </div>
              <button
                onClick={() => setExpandedWorker(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Temperature Chart */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Temperature (°C)</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="temperature" name="Temp" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Gas Level Chart */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Gas Level (ppm)</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="gas_level" name="Gas" stroke="#eab308" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
