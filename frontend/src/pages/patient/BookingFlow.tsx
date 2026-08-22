import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorService } from '../../services/doctor.service';
import { bookingService } from '../../services/booking.service';
import { Calendar as CalendarIcon, Clock, ChevronRight, Activity, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const BookingFlow = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  
  const [doctor, setDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<any[]>([]);
  const [heldAppointment, setHeldAppointment] = useState<any>(null);
  const [symptoms, setSymptoms] = useState('');
  const [step, setStep] = useState(1); // 1: Date/Time selection, 2: Symptoms, 3: Completed
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [holdTimer, setHoldTimer] = useState<number>(0);

  // Load doctor details
  useEffect(() => {
    const loadDoctor = async () => {
      try {
        const res = await doctorService.getDoctorProfile(doctorId!);
        setDoctor(res?.data || res);
      } catch (err) {
        toast.error('Failed to load doctor details');
      }
    };
    loadDoctor();
  }, [doctorId]);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate) return;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const res = await doctorService.getDoctorSlots(doctorId!, selectedDate);
        setSlots(res?.data || res || []);
      } catch (err) {
        toast.error('Failed to fetch available slots');
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDate, doctorId]);

  // 5 minute hold timer
  useEffect(() => {
    if (!heldAppointment || holdTimer <= 0) return;
    const interval = setInterval(() => {
      setHoldTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setHeldAppointment(null);
          setStep(1);
          toast.error('Hold expired! The slot has been released.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [heldAppointment, holdTimer]);

  const handleHoldSlot = async (slotStart: string) => {
    try {
      const res = await bookingService.holdSlot({ doctorId, slotStart });
      const appointment = res?.data || res;
      setHeldAppointment(appointment);
      setHoldTimer(300); // 5 minutes in seconds
      setStep(2);
      toast.success('Slot held for 5 minutes. Complete the symptom form to confirm.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'This slot is no longer available. Please select another slot.');
    }
  };

  const handleConfirmBooking = async () => {
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }

    try {
      await bookingService.confirmBooking(heldAppointment.id, { symptoms });
      setStep(3);
      setHeldAppointment(null);
      toast.success('Appointment booked successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to confirm booking.');
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!doctor) return <div className="text-center text-white py-12">Loading doctor profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <button
            onClick={() => navigate('/patient/doctors')}
            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Doctors</span>
          </button>
          <h1 className="text-3xl font-bold text-white">Book Appointment</h1>
          <p className="text-slate-400 mt-1">Consulting with {doctor.name}</p>
        </div>

        {heldAppointment && (
          <div className="bg-amber-500/10 text-amber-400 px-4 py-2 rounded-lg border border-amber-500/20 text-center">
            <div className="text-xs uppercase font-bold tracking-wider">Holding Slot</div>
            <div className="text-xl font-mono font-bold">{formatTimer(holdTimer)}</div>
          </div>
        )}
      </div>

      {/* Steps indicator */}
      <div className="flex items-center space-x-4 text-sm font-semibold">
        <span className={`${step === 1 ? 'text-teal-400' : 'text-slate-500'}`}>1. Choose Date & Time</span>
        <ChevronRight className="h-4 w-4 text-slate-600" />
        <span className={`${step === 2 ? 'text-teal-400' : 'text-slate-500'}`}>2. Symptom Form</span>
        <ChevronRight className="h-4 w-4 text-slate-600" />
        <span className={`${step === 3 ? 'text-teal-400' : 'text-slate-500'}`}>3. Confirmation</span>
      </div>

      {/* Step 1: Choose slot */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-teal-400" />
              <span>Select Date</span>
            </h2>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="glass p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Clock className="h-5 w-5 text-teal-400" />
              <span>Available Slots</span>
            </h2>

            {!selectedDate ? (
              <p className="text-slate-500 text-sm">Please select a date to view available time slots.</p>
            ) : isLoadingSlots ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-10 bg-slate-900 animate-pulse rounded-lg border border-slate-800" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-slate-400 text-sm">No available slots found for this date. Check working hours or leave days.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {slots.map((slot, index) => (
                  <button
                    key={index}
                    disabled={!slot.available}
                    onClick={() => handleHoldSlot(slot.start)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      slot.available
                        ? 'bg-slate-900 border-slate-800 hover:border-teal-500 text-slate-200 hover:text-white'
                        : 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Symptoms */}
      {step === 2 && heldAppointment && (
        <div className="glass p-8 rounded-xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-3 text-amber-400">
            <Activity className="h-6 w-6 animate-pulse" />
            <h2 className="text-xl font-bold text-white">Pre-Visit Symptom Form</h2>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Please describe the symptoms you are experiencing. This details chief complaints, duration, and severity. Our AI engine will compile this for the doctor before you step in.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">Symptoms Description</label>
            <textarea
              rows={6}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Example: I have had a severe throbbing headache on the right side of my head for 3 days. It causes slight nausea and sensitivity to bright lights..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setHeldAppointment(null);
                setStep(1);
              }}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold rounded-lg text-sm border border-slate-800"
            >
              Cancel Hold
            </button>
            <button
              onClick={handleConfirmBooking}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-lg text-sm transition-all transform hover:scale-[1.02]"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="glass p-12 rounded-xl border border-slate-800 text-center space-y-6">
          <div className="mx-auto h-16 w-16 bg-teal-500/10 text-teal-400 rounded-full flex items-center justify-center border border-teal-500/20">
            <ChevronRight className="h-8 w-8 rotate-90" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Booking Confirmed!</h2>
          <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
            Your appointment has been successfully scheduled. Check your email inbox for the booking confirmation. An AI pre-visit summary is currently compiling for your doctor.
          </p>

          <div className="pt-6">
            <button
              onClick={() => navigate('/patient/appointments')}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-lg text-sm hover:from-teal-600 hover:to-emerald-600 transition-all"
            >
              View My Appointments
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
