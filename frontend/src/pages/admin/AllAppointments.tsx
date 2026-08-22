import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { Calendar, Clock, Search, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StatusBadge } from '../../components/StatusBadge';

export const AllAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAllAppointments(statusFilter ? { status: statusFilter } : {});
      setAppointments(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to load appointments list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          All Appointments Overview
        </h1>
        <p className="text-slate-400 mt-1">Audit and search all appointment bookings across patient and doctor accounts.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex-1 relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="HELD">Held</option>
            <option value="BOOKED">Booked</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
          <Calendar className="mx-auto h-12 w-12 text-slate-700 mb-3" />
          <p className="text-slate-500 text-lg">No appointments found in the system database.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900/40 border border-slate-800 rounded-xl">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="bg-slate-950 text-xs uppercase text-slate-350 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Doctor Name</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => {
                const start = new Date(apt.slotStart);
                const format = start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <tr key={apt.id} className="border-b border-slate-850 hover:bg-slate-900/20 transition-all">
                    <td className="px-6 py-4 font-bold text-white flex items-center space-x-3">
                      <span>{apt.patient?.name || 'Patient'}</span>
                    </td>
                    <td className="px-6 py-4">{apt.doctor?.name || 'Doctor'}</td>
                    <td className="px-6 py-4">{format}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={apt.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
