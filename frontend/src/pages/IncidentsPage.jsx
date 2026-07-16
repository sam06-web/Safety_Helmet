import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  FireIcon, 
  BoltIcon, 
  SignalSlashIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { incidentsApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';

const IncidentIcon = ({ type, severity }) => {
  const colorClass = 
    severity === 'critical' ? 'text-red-500' :
    severity === 'high' ? 'text-orange-500' :
    severity === 'medium' ? 'text-yellow-500' : 'text-blue-500';

  switch (type) {
    case 'high_gas': return <FireIcon className={`h-6 w-6 ${colorClass}`} />;
    case 'high_temperature': return <FireIcon className={`h-6 w-6 ${colorClass}`} />;
    case 'helmet_removed': return <ExclamationTriangleIcon className={`h-6 w-6 ${colorClass}`} />;
    case 'emergency_button': return <BoltIcon className={`h-6 w-6 ${colorClass}`} />;
    case 'low_battery': return <BoltIcon className={`h-6 w-6 ${colorClass}`} />;
    case 'signal_lost': return <SignalSlashIcon className={`h-6 w-6 ${colorClass}`} />;
    default: return <ExclamationTriangleIcon className={`h-6 w-6 ${colorClass}`} />;
  }
};

const IncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    status: 'all'
  });
  const [toast, setToast] = useState(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.severity) params.severity = filters.severity;
      if (filters.status === 'unacknowledged') params.acknowledged = false;
      if (filters.status === 'resolved') params.resolved = true;
      
      const data = await incidentsApi.getIncidents(params);
      setIncidents(data);
    } catch (error) {
      console.error('Failed to fetch incidents', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [filters]);

  const handleAcknowledge = async (id) => {
    try {
      await incidentsApi.acknowledgeIncident(id);
      setToast({ message: 'Incident acknowledged', severity: 'success' });
      fetchIncidents();
    } catch (error) {
      setToast({ message: 'Failed to acknowledge', severity: 'error' });
    }
  };

  const handleResolve = async (id) => {
    try {
      await incidentsApi.resolveIncident(id);
      setToast({ message: 'Incident resolved', severity: 'success' });
      fetchIncidents();
    } catch (error) {
      setToast({ message: 'Failed to resolve', severity: 'error' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Incident History</h1>
          <p className="text-slate-400">Review and manage safety incidents</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-wrap gap-4">
          <select 
            className="bg-slate-700 border-slate-600 text-slate-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">All Statuses</option>
            <option value="unacknowledged">Unacknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <select 
            className="bg-slate-700 border-slate-600 text-slate-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value})}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select 
            className="bg-slate-700 border-slate-600 text-slate-100 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
          >
            <option value="">All Types</option>
            <option value="high_gas">High Gas</option>
            <option value="high_temperature">High Temperature</option>
            <option value="helmet_removed">Helmet Removed</option>
            <option value="emergency_button">Emergency Button</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><LoadingSpinner /></div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          {incidents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No incidents found matching criteria</div>
          ) : (
            <div className="space-y-8">
              {incidents.map((incident) => (
                <div key={incident.id} className="relative pl-8 sm:pl-32 py-2 group">
                  <div className="hidden sm:block absolute left-0 top-3 text-sm text-slate-400 w-24 text-right">
                    {new Date(incident.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    <div className="text-xs text-slate-500">
                      {new Date(incident.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="absolute left-0 sm:left-28 top-3 w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center z-10">
                    <IncidentIcon type={incident.incident_type} severity={incident.severity} />
                  </div>
                  
                  <div className="absolute left-4 sm:left-[126px] top-11 bottom-[-32px] w-0.5 bg-slate-700 group-last:hidden"></div>
                  
                  <div className="bg-slate-750/50 border border-slate-700 rounded-xl p-4 ml-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-100 capitalize">
                            {incident.incident_type?.replace(/_/g, ' ')}
                          </span>
                          <StatusBadge 
                            status={
                              incident.severity === 'critical' ? 'emergency' :
                              incident.severity === 'high' ? 'warning' : 'safe'
                            } 
                            text={incident.severity} 
                          />
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{incident.description}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <strong className="text-slate-300">Worker ID:</strong> {incident.worker_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <strong className="text-slate-300">Location:</strong> {incident.location || 'Unknown'}
                          </span>
                          {incident.gas_level && (
                            <span className="flex items-center gap-1">
                              <strong className="text-slate-300">Gas:</strong> {incident.gas_level} ppm
                            </span>
                          )}
                          {incident.temperature && (
                            <span className="flex items-center gap-1">
                              <strong className="text-slate-300">Temp:</strong> {incident.temperature}°C
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {!incident.acknowledged ? (
                          <button 
                            onClick={() => handleAcknowledge(incident.id)}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors border border-slate-600"
                          >
                            Acknowledge
                          </button>
                        ) : !incident.resolved ? (
                          <button 
                            onClick={() => handleResolve(incident.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckIcon className="h-4 w-4" /> Resolve
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-green-500 text-sm font-medium px-3 py-1.5">
                            <CheckCircleIcon className="h-5 w-5" /> Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-fade-in ${
          toast.severity === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default IncidentsPage;
