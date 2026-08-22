import React, { useState, useEffect } from 'react';
import { bookingService } from '../../services/booking.service';
import { Calendar, Clock, AlertTriangle, FileText, Pill, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StatusBadge } from '../../components/StatusBadge';

export const MyAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('UPCOMING');

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await bookingService.getMyAppointments();
      setAppointments(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await bookingService.cancelBooking(id);
      toast.success('Appointment cancelled successfully');
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel appointment');
    }
  };

  const filtered = appointments.filter((apt) => {
    if (activeTab === 'UPCOMING') return apt.status === 'BOOKED' || apt.status === 'HELD';
    if (activeTab === 'COMPLETED') return apt.status === 'COMPLETED';
    return apt.status === 'CANCELLED';
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          My Appointments
        </h1>
        <p className="text-slate-400 mt-2">Track symptom reports, consult summaries, and medication alerts.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-px">
        {(['UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setExpandedId(null);
            }}
            className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
              activeTab === tab ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
          <Calendar className="mx-auto h-12 w-12 text-slate-700 mb-3" />
          <p className="text-slate-500 text-lg">No appointments found in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => {
            const isExpanded = expandedId === apt.id;
            const start = new Date(apt.slotStart);
            const dateStr = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // AI Pre-visit summary data
            const preSummary = apt.symptomForm?.aiSummaryJson;
            // AI Post-visit summary data
            const postSummary = apt.visitNotes?.aiPatientSummaryJson;

            return (
              <div key={apt.id} className="glass p-5 rounded-xl border border-slate-800/80 transition-all space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold">
                      Dr
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Consultation with Doctor</h4>
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

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <StatusBadge status={apt.status} />
                    {apt.symptomForm?.urgencyLevel && (
                      <StatusBadge status={apt.symptomForm.urgencyLevel} />
                    )}
                    <button
                      onClick={() => toggleExpand(apt.id)}
                      className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 pt-5 mt-4 space-y-6 animate-fadeIn">
                    {/* Pre-visit symptom forms & AI Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h5 className="font-bold text-slate-200 text-sm flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-teal-400" />
                          <span>Symptoms Submitted</span>
                        </h5>
                        <p className="text-sm bg-slate-950 p-4 rounded-lg border border-slate-800/50 text-slate-400 italic">
                          "{apt.symptomForm?.rawSymptoms || 'No symptoms submitted'}"
                        </p>
                      </div>

                      {preSummary && (
                        <div className="space-y-3">
                          <h5 className="font-bold text-slate-200 text-sm flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span>AI Pre-visit Assessment</span>
                          </h5>
                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/50 space-y-3 text-sm text-slate-400">
                            <div>
                              <span className="font-bold text-slate-300">Chief Complaint:</span> {preSummary.chief_complaint}
                            </div>
                            <div>
                              <span className="font-bold text-slate-300 block mb-1">Recommended Questions for Doctor:</span>
                              <ul className="list-disc pl-4 space-y-1">
                                {preSummary.suggested_questions?.map((q: string, i: number) => (
                                  <li key={i}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Post-visit details and AI Summary */}
                    {apt.status === 'COMPLETED' && (
                      <div className="border-t border-slate-850 pt-5 space-y-6">
                        <h4 className="text-base font-bold text-white uppercase tracking-wider">Post-Visit Summaries</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Doctor Notes */}
                          <div className="space-y-3">
                            <h5 className="font-bold text-slate-200 text-sm flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-emerald-400" />
                              <span>Clinical Record & Prescription</span>
                            </h5>
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/50 space-y-3 text-sm text-slate-400">
                              <div>
                                <span className="font-bold text-slate-300 block">Clinical Notes:</span>
                                <p className="mt-1">{apt.visitNotes?.clinicalNotes}</p>
                              </div>
                              {apt.visitNotes?.prescription && (
                                <div className="border-t border-slate-900 pt-2">
                                  <span className="font-bold text-slate-300 block">Prescription:</span>
                                  <p className="mt-1 text-emerald-400 font-mono">{apt.visitNotes.prescription}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* AI Patient Summary */}
                          {postSummary && (
                            <div className="space-y-3">
                              <h5 className="font-bold text-slate-200 text-sm flex items-center space-x-2">
                                <Pill className="h-4 w-4 text-emerald-400 animate-pulse" />
                                <span>Patient-friendly Summary & Schedule</span>
                              </h5>
                              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/50 space-y-3 text-sm text-slate-400">
                                <div>
                                  <span className="font-bold text-slate-300">Summary:</span> {postSummary.summary}
                                </div>

                                {postSummary.medication_schedule?.length > 0 && (
                                  <div>
                                    <span className="font-bold text-slate-300 block mb-1">Medication Routine:</span>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-left border border-slate-900">
                                        <thead>
                                          <tr className="bg-slate-900 text-slate-300">
                                            <th className="p-1.5">Drug</th>
                                            <th className="p-1.5">Dosage</th>
                                            <th className="p-1.5">Freq</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {postSummary.medication_schedule.map((med: any, idx: number) => (
                                            <tr key={idx} className="border-t border-slate-900">
                                              <td className="p-1.5 text-slate-200 font-bold">{med.medication || med.name}</td>
                                              <td className="p-1.5">{med.dosage}</td>
                                              <td className="p-1.5">{med.frequency}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {(apt.status === 'BOOKED' || apt.status === 'HELD') && (
                      <div className="flex justify-end pt-4 border-t border-slate-800">
                        <button
                          onClick={() => handleCancel(apt.id)}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-all"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
