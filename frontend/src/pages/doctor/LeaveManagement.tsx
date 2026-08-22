import React, { useState, useEffect } from 'react';
import { doctorService } from '../../services/doctor.service';
import { useAuthStore } from '../../stores/auth.store';
import { Calendar, Trash2, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const LeaveManagement = () => {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeaves = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await doctorService.getLeaves(user.id);
      setLeaves(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to fetch leave records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    try {
      await doctorService.addLeave(user!.id, { date, reason });
      toast.success('Leave scheduled successfully! Conflicting appointments were cancelled and patients notified.');
      setDate('');
      setReason('');
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to schedule leave');
    }
  };

  const handleRemoveLeave = async (leaveId: string) => {
    if (!window.confirm('Remove this leave record?')) return;
    try {
      await doctorService.removeLeave(user!.id, leaveId);
      toast.success('Leave record removed');
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove leave');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          Leave Management
        </h1>
        <p className="text-slate-400 mt-1">Schedule leave periods and manage working days.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Add Leave Form */}
        <div className="glass p-6 rounded-xl border border-slate-800 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-teal-400" />
            <span>Schedule Leave Day</span>
          </h2>

          <div className="bg-amber-500/10 text-amber-400 px-4 py-3 rounded-lg border border-amber-500/20 text-xs flex items-start space-x-2">
            <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Important:</strong> Creating a leave day will automatically cancel all booked appointments for that date and notify patients via email.
            </p>
          </div>

          <form onSubmit={handleAddLeave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Leave Date</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Family event, medical checkup..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-lg text-sm transition-all"
            >
              Add Leave Record
            </button>
          </form>
        </div>

        {/* Existing Leaves List */}
        <div className="glass p-6 rounded-xl border border-slate-800 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-teal-400" />
            <span>Scheduled Leaves</span>
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-12 bg-slate-900 animate-pulse rounded-lg border border-slate-800" />
              ))}
            </div>
          ) : leaves.length === 0 ? (
            <p className="text-slate-500 text-sm">No leaves currently scheduled.</p>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave) => {
                const leaveDate = new Date(leave.date);
                const format = leaveDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <div
                    key={leave.id}
                    className="flex justify-between items-center p-3.5 bg-slate-950 rounded-lg border border-slate-850"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{format}</div>
                      {leave.reason && (
                        <div className="text-xs text-slate-500 mt-0.5">Reason: {leave.reason}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveLeave(leave.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
