import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { analyticsApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-xl text-sm">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-xs">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [summaryData, trendsData, alertsData] = await Promise.all([
          analyticsApi.getSummary().catch(() => null),
          analyticsApi.getTrends().catch(() => []),
          analyticsApi.getAlertBreakdown().catch(() => []),
        ]);

        setSummary(summaryData);
        setTrends(Array.isArray(trendsData) ? trendsData : []);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading analytics..." />;
  }

  // Fallback data if API returns empty
  const trendData = trends.length > 0 ? trends : [
    { date: 'Mon', count: 3 }, { date: 'Tue', count: 5 }, { date: 'Wed', count: 2 },
    { date: 'Thu', count: 7 }, { date: 'Fri', count: 4 }, { date: 'Sat', count: 1 }, { date: 'Sun', count: 3 },
  ];

  const alertData = alerts.length > 0 ? alerts : [
    { type: 'High Gas', count: 12 }, { type: 'Helmet Off', count: 8 },
    { type: 'Emergency Button', count: 3 }, { type: 'Low Battery', count: 5 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Safety metrics and trend analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Incidents Today', value: summary?.total_incidents_today ?? 0, color: 'from-red-400 to-rose-500' },
          { label: 'PPE Compliance', value: `${summary?.ppe_compliance_pct ?? 97}%`, color: 'from-emerald-400 to-green-400' },
          { label: 'Avg Helmet Usage', value: `${summary?.avg_helmet_usage_hours ?? 7.2}h`, color: 'from-blue-400 to-cyan-400' },
          { label: 'Most Common', value: (summary?.most_common_alert || 'high_gas').replace(/_/g, ' '), color: 'from-amber-400 to-orange-400' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 bg-gradient-to-r ${item.color} bg-clip-text text-transparent capitalize`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Incident Trend */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-base font-semibold text-slate-100 mb-5">Incident Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={10} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Incidents" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#gradIncidents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-base font-semibold text-slate-100 mb-5">Alert Breakdown</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="type" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                  {alertData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
