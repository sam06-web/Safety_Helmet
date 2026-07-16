import { useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  UsersIcon,
  ServerIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('thresholds');
  const [saved, setSaved] = useState(false);

  const [thresholds, setThresholds] = useState({
    gasWarning: 100,
    gasDanger: 200,
    tempWarning: 40,
    tempDanger: 50,
    batteryLow: 20,
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm">Administrator access required.</p>
        </div>
      </div>
    );
  }

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'thresholds', label: 'Thresholds', icon: AdjustmentsHorizontalIcon },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'system', label: 'System', icon: ServerIcon },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">System configuration and management</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Tab Navigation */}
        <div className="lg:w-52 shrink-0">
          <nav className="flex lg:flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500/15 to-cyan-500/10 text-cyan-400'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          
          {activeTab === 'thresholds' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Alert Thresholds</h2>
                <p className="text-xs text-slate-500 mt-1">Set values that trigger safety warnings.</p>
              </div>

              {[
                { section: 'Gas Level (ppm)', color: 'bg-amber-500', fields: [
                  { key: 'gasWarning', label: 'Warning' },
                  { key: 'gasDanger', label: 'Danger' },
                ]},
                { section: 'Temperature (°C)', color: 'bg-red-500', fields: [
                  { key: 'tempWarning', label: 'Warning' },
                  { key: 'tempDanger', label: 'Danger' },
                ]},
                { section: 'Battery (%)', color: 'bg-blue-500', fields: [
                  { key: 'batteryLow', label: 'Low Battery Alert' },
                ]},
              ].map((group) => (
                <div key={group.section}>
                  <h3 className="text-sm text-slate-300 font-medium mb-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${group.color}`} /> {group.section}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.fields.map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                        <input
                          type="number"
                          value={thresholds[f.key]}
                          onChange={(e) => setThresholds((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                          className="input-field text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                {saved && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircleIcon className="w-4 h-4" /> Saved</p>}
                {!saved && <span />}
                <button type="submit" className="px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-cyan-600 transition-all">
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">User Management</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage dashboard access.</p>
                </div>
                <button className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-medium hover:bg-blue-500/20 transition-colors">
                  + Add User
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {[
                  { name: 'admin', email: 'admin@safeguard.local', role: 'Admin', roleColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                  { name: 'supervisor', email: 'super@safeguard.local', role: 'Supervisor', roleColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                  { name: 'safety_officer', email: 'officer@safeguard.local', role: 'Officer', roleColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                ].map((u) => (
                  <div key={u.name} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-sm font-semibold text-slate-300">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.roleColor}`}>{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">System Info</h2>
                <p className="text-xs text-slate-500 mt-1">Platform health overview.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Version', value: 'v1.0.0', color: 'text-slate-200' },
                  { label: 'Database', value: 'SQLite', color: 'text-slate-200' },
                  { label: 'Helmets Registered', value: '20', color: 'text-blue-400' },
                  { label: 'Workers Registered', value: '20', color: 'text-cyan-400' },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className={`text-sm font-mono font-medium mt-0.5 ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
