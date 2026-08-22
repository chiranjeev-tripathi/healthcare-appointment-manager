import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/booking.service';
import { Calendar, Clock, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StatusBadge } from '../../components/StatusBadge';

export const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await bookingService.getMyAppointments();
      setAppointments(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to load dashboard appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleComplete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Mark this appointment as completed?')) return;
    try {
      await bookingService.completeAppointment(id);
      toast.success('Appointment marked completed');
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to complete appointment');
    }
  };

  // Filter out cancelled and held slots, sort booked ones by start date
  const upcoming = appointments
    .filter((a) => a.status === 'BOOKED')
    .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime());

  const completed = appointments.filter((a) => a.status === 'COMPLETED');

  const urgentCount = upcoming.filter((a) => a.symptomForm?.urgencyLevel === 'HIGH').length;

  return (
    <div className="space-y-8">
      {/* Welcome & Stats Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Doctor Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Review upcoming patients and record clinical reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl border border-slate-800 space-y-2">
          <span className="text-sm font-semibold text-slate-450 block">Upcoming Consults</span>
          <div className="text-3xl font-extrabold text-white">{upcoming.length}</div>
        </div>
        <div className="glass p-6 rounded-xl border border-slate-850 space-y-2">
          <span className="text-sm font-semibold text-slate-450 block flex items-center space-x-1">
            <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            <span>Urgent Cases</span>
          </span>
          <div className="text-3xl font-extrabold text-red-400">{urgentCount}</div>
        </div>
        <div className="glass p-6 rounded-xl border border-slate-800 space-y-2">
          <span className="text-sm font-semibold text-slate-450 block">Completed Today</span>
          <div className="text-3xl font-extrabold text-emerald-400">{completed.length}</div>
        </div>
      </div>

      {/* Appointment Listings */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Upcoming Appointments</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
            <CheckCircle className="mx-auto h-12 w-12 text-slate-700 mb-3" />
            <p className="text-slate-550 text-lg">No upcoming bookings. Enjoy your day!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {upcoming.map((apt) => {
              const start = new Date(apt.slotStart);
              const dateStr = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
              const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div
                  key={apt.id}
                  onClick={() => navigate(`/doctor/appointments/${apt.id}`)}
                  className="glass p-5 rounded-xl border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/40 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-slate-850 border border-slate-750 flex items-center justify-center text-teal-400 font-bold">
                      {apt.patient?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{apt.patient?.name || 'Unknown Patient'}</h4>
                      <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w.3 text-teal-500" />
                          <span>{dateStr}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w.3 text-teal-500" />
                          <span>{timeStr}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end md:self-center">
                    {apt.symptomForm?.urgencyLevel && (
                      <StatusBadge status={apt.symptomForm.urgencyLevel} />
                    )}
                    <button
                      onClick={(e) => handleComplete(e, apt.id)}
                      className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-lg text-xs transition-all transform hover:scale-[1.01]"
                    >
                      Complete
                    </button>
                    <button className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 text-xs">
                      Record Notes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
