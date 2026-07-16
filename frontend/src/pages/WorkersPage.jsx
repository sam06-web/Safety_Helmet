import { useState, useEffect, useCallback } from 'react';
import { workersApi } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const departments = ['All', 'Mining', 'Construction', 'Welding', 'Electrical', 'Chemical', 'Maintenance', 'Logistics'];
const shifts = ['All', 'Morning', 'Afternoon', 'Night'];
const statuses = ['All', 'safe', 'warning', 'emergency', 'offline'];

const emptyWorker = {
  employee_id: '',
  name: '',
  department: '',
  shift: '',
  contact_phone: '',
  contact_email: '',
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterShift, setFilterShift] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [formData, setFormData] = useState(emptyWorker);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const pageSize = 10;

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterDept !== 'All') params.department = filterDept;
      if (filterShift !== 'All') params.shift = filterShift;
      if (filterStatus !== 'All') params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;
      const data = await workersApi.getWorkers(params);
      setWorkers(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterShift, filterStatus, searchQuery]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const filteredWorkers = workers;
  const totalPages = Math.ceil(filteredWorkers.length / pageSize);
  const paginatedWorkers = filteredWorkers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const openAddModal = () => {
    setEditingWorker(null);
    setFormData(emptyWorker);
    setModalOpen(true);
  };

  const openEditModal = (worker) => {
    setEditingWorker(worker);
    setFormData({
      employee_id: worker.employee_id || '',
      name: worker.name || '',
      department: worker.department || '',
      shift: worker.shift || '',
      contact_phone: worker.contact_phone || '',
      contact_email: worker.contact_email || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingWorker) {
        await workersApi.updateWorker(editingWorker.id, formData);
      } else {
        await workersApi.createWorker(formData);
      }
      setModalOpen(false);
      fetchWorkers();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await workersApi.deleteWorker(id);
      setDeleteConfirm(null);
      fetchWorkers();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Workers</h2>
          <p className="text-sm text-slate-400 mt-0.5">{workers.length} total workers</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Add Worker
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="input-field pl-9 py-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-slate-500" />
            <select
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
              className="input-field py-2 w-36"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
              ))}
            </select>
            <select
              value={filterShift}
              onChange={(e) => { setFilterShift(e.target.value); setCurrentPage(1); }}
              className="input-field py-2 w-32"
            >
              {shifts.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All Shifts' : s}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="input-field py-2 w-32"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Loading workers..." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Employee ID</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Department</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Shift</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Helmet</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {paginatedWorkers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-500 text-sm">
                      No workers found
                    </td>
                  </tr>
                ) : (
                  paginatedWorkers.map((worker, i) => (
                    <tr
                      key={worker.id || i}
                      className={`hover:bg-slate-700/30 transition-colors ${
                        i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'
                      }`}
                    >
                      <td className="px-5 py-3 text-sm text-slate-300 font-mono">
                        {worker.employee_id || '-'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-xs font-semibold text-slate-300">
                            {worker.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-medium text-slate-200">{worker.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400">{worker.department || '-'}</td>
                      <td className="px-5 py-3 text-sm text-slate-400">{worker.shift || '-'}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={worker.status || 'offline'} />
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400 font-mono">
                        {worker.helmet_id || 'Not assigned'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(worker)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(worker)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredWorkers.length)} of {filteredWorkers.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingWorker ? 'Edit Worker' : 'Add New Worker'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Employee ID</label>
              <input
                type="text"
                value={formData.employee_id}
                onChange={(e) => handleFieldChange('employee_id', e.target.value)}
                className="input-field"
                required
                placeholder="EMP-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="input-field"
                required
                placeholder="John Doe"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => handleFieldChange('department', e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select department</option>
                {departments.filter((d) => d !== 'All').map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Shift</label>
              <select
                value={formData.shift}
                onChange={(e) => handleFieldChange('shift', e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select shift</option>
                {shifts.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                className="input-field"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                className="input-field"
                placeholder="john@company.com"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editingWorker ? 'Save Changes' : 'Add Worker'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Worker"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete <span className="font-semibold text-slate-100">{deleteConfirm?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger">
              Delete Worker
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
