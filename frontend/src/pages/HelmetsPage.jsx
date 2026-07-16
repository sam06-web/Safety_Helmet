import { useState, useEffect, useCallback } from 'react';
import { helmetsApi, workersApi } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  PlusIcon,
  ShieldCheckIcon,
  BoltIcon,
  CpuChipIcon,
  UserIcon,
  FunnelIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

function BatteryBar({ level }) {
  let color = 'bg-green-500';
  let textColor = 'text-green-400';
  if (level <= 20) {
    color = 'bg-red-500';
    textColor = 'text-red-400';
  } else if (level <= 50) {
    color = 'bg-yellow-500';
    textColor = 'text-yellow-400';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${textColor} w-8 text-right`}>{level}%</span>
    </div>
  );
}

export default function HelmetsPage() {
  const [helmets, setHelmets] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [formData, setFormData] = useState({ helmet_id: '', firmware_version: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [helmetsData, workersData] = await Promise.all([
        helmetsApi.getHelmets().catch(() => []),
        workersApi.getWorkers().catch(() => []),
      ]);
      setHelmets(Array.isArray(helmetsData) ? helmetsData : helmetsData?.items || []);
      setWorkers(Array.isArray(workersData) ? workersData : workersData?.items || []);
    } catch (err) {
      console.error('Failed to fetch helmets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredHelmets = filterStatus === 'all'
    ? helmets
    : helmets.filter((h) => h.status === filterStatus);

  const handleRegister = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await helmetsApi.createHelmet(formData);
      setModalOpen(false);
      setFormData({ helmet_id: '', firmware_version: '' });
      fetchData();
    } catch (err) {
      console.error('Register error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (helmetId, workerId) => {
    try {
      if (workerId) {
        await helmetsApi.assignHelmet(helmetId, workerId);
      } else {
        await helmetsApi.unassignHelmet(helmetId);
      }
      setAssignModal(null);
      fetchData();
    } catch (err) {
      console.error('Assign error:', err);
    }
  };

  if (loading) return <LoadingSpinner text="Loading helmets..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Helmet Registry</h2>
          <p className="text-sm text-slate-400 mt-0.5">{helmets.length} registered helmets</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Register Helmet
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <FunnelIcon className="w-4 h-4 text-slate-500" />
        {['all', 'active', 'inactive', 'maintenance'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Helmet Grid */}
      {filteredHelmets.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldCheckIcon className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">No helmets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredHelmets.map((helmet) => (
            <div
              key={helmet.id}
              className="card-hover p-5 group"
            >
              {/* Helmet Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                    <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {helmet.helmet_id || `HLM-${helmet.id}`}
                    </p>
                    <StatusBadge status={helmet.status || 'inactive'} />
                  </div>
                </div>
              </div>

              {/* Battery */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <BoltIcon className="w-3 h-3" /> Battery
                  </span>
                </div>
                <BatteryBar level={helmet.battery_level ?? 100} />
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <CpuChipIcon className="w-3 h-3" /> Firmware
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {helmet.firmware_version || 'v1.0.0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> Assigned
                  </span>
                  <span className="text-xs text-slate-300">
                    {helmet.worker_name || helmet.assigned_to || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-700/50">
                <button
                  onClick={() => setAssignModal(helmet)}
                  className="flex-1 text-xs font-medium py-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                >
                  {helmet.worker_name || helmet.assigned_to ? 'Reassign' : 'Assign'}
                </button>
                <button
                  className="flex-1 text-xs font-medium py-1.5 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                >
                  <WrenchScrewdriverIcon className="w-3 h-3" />
                  Maintain
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New Helmet"
        size="sm"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Helmet ID</label>
            <input
              type="text"
              value={formData.helmet_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, helmet_id: e.target.value }))}
              className="input-field"
              required
              placeholder="HLM-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Firmware Version</label>
            <input
              type="text"
              value={formData.firmware_version}
              onChange={(e) => setFormData((prev) => ({ ...prev, firmware_version: e.target.value }))}
              className="input-field"
              placeholder="v1.0.0"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Register
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={`Assign Helmet ${assignModal?.helmet_id || ''}`}
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">Select a worker to assign this helmet to:</p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            <button
              onClick={() => handleAssign(assignModal?.id, null)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 transition-colors"
            >
              Unassign
            </button>
            {workers.map((worker) => (
              <button
                key={worker.id}
                onClick={() => handleAssign(assignModal?.id, worker.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs">
                  {worker.name?.[0]?.toUpperCase() || '?'}
                </div>
                {worker.name} <span className="text-slate-500 text-xs ml-auto">{worker.department}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
