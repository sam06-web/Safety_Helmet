import { useState } from 'react';
import {
  DocumentArrowDownIcon,
  TableCellsIcon,
  CalendarIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import { reportsApi } from '../services/api';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('daily');
  const [format, setFormat] = useState('pdf');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);

  const reports = [
    { id: 'daily', title: 'Daily Safety Summary', desc: 'All incidents, alerts, and worker activity for a specific day.' },
    { id: 'weekly', title: 'Weekly Incident Report', desc: 'Detailed breakdown of safety events over the past 7 days.' },
  ];

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setMessage(null);

      if (format === 'pdf') {
        if (reportType === 'daily') {
          await reportsApi.downloadDailyPDF(date);
        } else {
          await reportsApi.downloadWeeklyPDF();
        }
      } else {
        await reportsApi.exportExcel('incidents');
      }

      setMessage({ type: 'success', text: 'Report downloaded successfully!' });
    } catch (error) {
      console.error('Report generation failed', error);
      setMessage({ type: 'error', text: 'Failed to generate report. Please try again.' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Generate and download compliance reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Report Type Selection */}
        <div className="lg:col-span-3 space-y-3">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                reportType === r.id
                  ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <DocumentChartBarIcon className={`w-5 h-5 flex-shrink-0 ${reportType === r.id ? 'text-blue-400' : 'text-slate-500'}`} />
                <div>
                  <p className={`font-medium ${reportType === r.id ? 'text-blue-400' : 'text-slate-200'}`}>{r.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Config & Download */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
          <h2 className="text-base font-semibold text-slate-200">Options</h2>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Format</label>
            <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button
                onClick={() => setFormat('pdf')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  format === 'pdf' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <DocumentArrowDownIcon className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  format === 'excel' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableCellsIcon className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-4 w-4" /> Download Report
              </>
            )}
          </button>

          {message && (
            <p className={`text-xs text-center ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
