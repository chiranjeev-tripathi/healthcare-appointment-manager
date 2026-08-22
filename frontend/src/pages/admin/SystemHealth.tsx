import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { ShieldCheck, Mail, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SystemHealth = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getSystemHealth();
      setHealthData(res?.data || res);
    } catch (err) {
      toast.error('Failed to load system health metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            System Health Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Monitor booking stats, background queues, and failed logs.</p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh Now'}</span>
        </button>
      </div>

      {healthData ? (
        <div className="space-y-8">
          {/* Appointment Status Cards */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Appointment Volumes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="glass p-5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Held Slots</span>
                <span className="text-3xl font-extrabold text-amber-400">
                  {healthData.appointments?.HELD || 0}
                </span>
              </div>
              <div className="glass p-5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Booked Consults</span>
                <span className="text-3xl font-extrabold text-teal-400">
                  {healthData.appointments?.BOOKED || 0}
                </span>
              </div>
              <div className="glass p-5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Completed Sessions</span>
                <span className="text-3xl font-extrabold text-emerald-400">
                  {healthData.appointments?.COMPLETED || 0}
                </span>
              </div>
              <div className="glass p-5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Cancelled Appointments</span>
                <span className="text-3xl font-extrabold text-red-400">
                  {healthData.appointments?.CANCELLED || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Background Queues & Notification Failures */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-teal-400" />
              <span>Notification Logs & Queue Health</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Failed Cards */}
              <div className="glass p-6 rounded-xl border border-slate-800 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-slate-400 block">Failed Logs</span>
                  <div className="text-3xl font-extrabold text-white">
                    {healthData.notifications?.failed || 0}
                  </div>
                  <span className="text-xs text-slate-500 block mt-1">Pending first backoff retry</span>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <Mail className="h-6 w-6" />
                </div>
              </div>

              {/* Pending Retry Cards */}
              <div className="glass p-6 rounded-xl border border-slate-800 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-slate-400 block">In Retry Queue</span>
                  <div className="text-3xl font-extrabold text-teal-400">
                    {healthData.notifications?.pendingRetries || 0}
                  </div>
                  <span className="text-xs text-slate-500 block mt-1">Exponential backoff running</span>
                </div>
                <div className="p-3 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>

              {/* Dead Letter Cards */}
              <div className="glass p-6 rounded-xl border border-slate-800 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-slate-400 block">Dead-Letter Logs</span>
                  <div className="text-3xl font-extrabold text-red-400">
                    {healthData.notifications?.deadLetter || 0}
                  </div>
                  <span className="text-xs text-slate-555 block mt-1 text-red-500/70">Requires manual check</span>
                </div>
                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">No system health data found.</div>
      )}
    </div>
  );
};
