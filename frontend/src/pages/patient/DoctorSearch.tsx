import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorService } from '../../services/doctor.service';
import { DoctorProfile } from '../../types';
import { Search, Calendar, Heart, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const DoctorSearch = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialisation, setSpecialisation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const response = await doctorService.listDoctors({ specialisation });
      // The API returns { success: true, data: [...] } if interceptor doesn't unwrap
      // Let's handle both unwrapped and wrapped structures
      const list = response?.data || response || [];
      setDoctors(list);
    } catch (error) {
      toast.error('Failed to load doctors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [specialisation]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          Find a Healthcare Specialist
        </h1>
        <p className="text-slate-400 mt-2">Book an in-person or virtual consultation with our certified doctors.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
          <input
            type="text"
            value={specialisation}
            onChange={(e) => setSpecialisation(e.target.value)}
            placeholder="Search by specialisation (e.g. Cardiology, Dermatology...)"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-60 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
          <Heart className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-lg">No doctors found matching that specialisation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => {
            const profile = doctor.doctorProfile || doctor.profile;
            return (
              <div
                key={doctor.id}
                className="glass-card hover-lift p-6 border border-slate-800/80 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="h-14 w-14 rounded-full bg-teal-900/30 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-xl">
                      {doctor.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      {profile?.specialisation || 'General Medicine'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mt-4">{doctor.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{doctor.email}</p>
                  
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-4">
                    <Award className="h-4 w-4 text-emerald-400" />
                    <span>Duration: {profile?.slotDurationMinutes || 30} mins per session</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => navigate(`/patient/book/${doctor.id}`)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-lg text-sm transition-all transform hover:scale-[1.02]"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Book Appointment</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
