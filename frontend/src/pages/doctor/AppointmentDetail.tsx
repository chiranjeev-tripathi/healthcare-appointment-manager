import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/booking.service';
import { visitService } from '../../services/visit.service';
import { ArrowLeft, Activity, ShieldAlert, Sparkles, MessageSquare, Clipboard, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StatusBadge } from '../../components/StatusBadge';

export const DoctorAppointmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const fetchAppointmentDetails = async () => {
    setIsLoading(true);
    try {
      const res = await bookingService.getAppointment(id!);
      const data = res?.data || res;
      setAppointment(data);
      if (data.visitNotes) {
        setClinicalNotes(data.visitNotes.clinicalNotes || '');
        setPrescription(data.visitNotes.prescription || '');
        setAiSummary(data.visitNotes.aiPatientSummaryJson);
      }
    } catch (err) {
      toast.error('Failed to load appointment details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointmentDetails();
  }, [id]);

  const handleSubmitNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicalNotes.trim()) {
      toast.error('Clinical notes are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await visitService.submitNotes(id!, { clinicalNotes, prescription });
      toast.success('Clinical notes recorded. AI patient summary generation triggered!');
      fetchAppointmentDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateSummary = async () => {
    setIsLoadingSummary(true);
    try {
      await visitService.regenerateSummary(id!);
      toast.success('AI Regeneration started. Please refresh in a moment.');
      // Refresh after short delay
      setTimeout(fetchAppointmentDetails, 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to trigger AI regeneration.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  if (isLoading || !appointment) return <div className="text-center text-white py-12">Loading details...</div>;

  const start = new Date(appointment.slotStart);
  const dateStr = start.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const preSummary = appointment.symptomForm?.aiSummaryJson;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/doctor/dashboard')}
          className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Patient Appointment Detail</h1>
            <p className="text-slate-400 mt-1">
              Consultation with <span className="text-white font-bold">{appointment.patient?.name}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <StatusBadge status={appointment.status} />
            {appointment.symptomForm?.urgencyLevel && (
              <StatusBadge status={appointment.symptomForm.urgencyLevel} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Symptoms & AI Pre-visit summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Details Card */}
          <div className="glass p-6 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Schedule Info</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <div>
                <span className="text-slate-500 font-medium">Date:</span> {dateStr}
              </div>
              <div>
                <span className="text-slate-500 font-medium">Time:</span> {timeStr}
              </div>
              <div>
                <span className="text-slate-500 font-medium">Email:</span> {appointment.patient?.email}
              </div>
            </div>
          </div>

          {/* Symptoms Details */}
          <div className="glass p-6 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-teal-400" />
              <span>Patient Symptoms</span>
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-850 italic">
              "{appointment.symptomForm?.rawSymptoms || 'No symptoms provided'}"
            </p>
          </div>

          {/* AI Assessment */}
          {preSummary && (
            <div className="glass p-6 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
                <span>AI Pre-visit summary</span>
              </h3>
              <div className="space-y-3 text-sm text-slate-400">
                <div>
                  <span className="font-bold text-slate-300">Urgency:</span> {preSummary.urgency_level}
                </div>
                <div>
                  <span className="font-bold text-slate-300">Chief Complaint:</span> {preSummary.chief_complaint}
                </div>
                <div>
                  <span className="font-bold text-slate-300 block mb-2 flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4 text-teal-400" />
                    <span>Suggested Questions:</span>
                  </span>
                  <ul className="list-disc pl-4 space-y-1">
                    {preSummary.suggested_questions?.map((q: string, idx: number) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Clinical Record input & AI Patient summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes Input */}
          <div className="glass p-8 rounded-xl border border-slate-800 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Clipboard className="h-5 w-5 text-teal-400" />
              <span>Consultation Report</span>
            </h3>

            <form onSubmit={handleSubmitNotes} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-355 mb-2">Clinical Notes</label>
                <textarea
                  rows={6}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record patient complaints, exam findings, diagnostic tests..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-355 mb-2">Prescription (Optional)</label>
                <textarea
                  rows={3}
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="Example: Amoxicillin 500mg - 3 times daily for 7 days"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-lg text-sm transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Recording...' : 'Record Notes & Generate summary'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* AI Patient friendly summary */}
          {appointment.visitNotes && (
            <div className="glass p-8 rounded-xl border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-teal-400" />
                  <span>AI Patient Summary</span>
                </h3>
                <button
                  onClick={handleRegenerateSummary}
                  disabled={isLoadingSummary}
                  className="px-3 py-1.5 bg-slate-905 hover:bg-slate-850 text-teal-400 font-bold rounded-lg text-xs border border-slate-800"
                >
                  {isLoadingSummary ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>

              {aiSummary ? (
                <div className="space-y-4 text-sm text-slate-400">
                  <div>
                    <span className="font-bold text-slate-300 block mb-1">Friendly Summary:</span>
                    <p className="leading-relaxed">{aiSummary.summary}</p>
                  </div>

                  {aiSummary.medication_schedule?.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-300 block mb-2">Medication Routine:</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border border-slate-900">
                          <thead>
                            <tr className="bg-slate-900 text-slate-300">
                              <th className="p-2">Medication</th>
                              <th className="p-2">Dosage</th>
                              <th className="p-2">Frequency</th>
                              <th className="p-2">Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aiSummary.medication_schedule.map((med: any, idx: number) => (
                              <tr key={idx} className="border-t border-slate-900">
                                <td className="p-2 text-slate-200 font-bold">{med.medication}</td>
                                <td className="p-2">{med.dosage}</td>
                                <td className="p-2">{med.frequency}</td>
                                <td className="p-2">{med.instructions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {aiSummary.follow_up_steps?.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-300 block mb-1">Follow-up Steps:</span>
                      <ul className="list-disc pl-4 space-y-1">
                        {aiSummary.follow_up_steps.map((step: string, idx: number) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm italic">Summary generating or unavailable...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
