import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { doctorService } from '../../services/doctor.service';
import { Plus, UserPlus, Clock, Settings, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from '../../components/Modal';

export const DoctorManagement = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // New Doctor Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialisation, setSpecialisation] = useState('');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      // List all doctors
      const res = await doctorService.listDoctors();
      setDoctors(res?.data || res || []);
    } catch (err) {
      toast.error('Failed to load doctors list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !specialisation) {
      toast.error('Please fill in all fields');
      return;
    }

    const defaultWorkingHours = {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
    };

    try {
      await adminService.createDoctor({
        name,
        email,
        password,
        specialisation,
        slotDurationMinutes,
        workingHours: defaultWorkingHours
      });
      toast.success('Doctor account created successfully!');
      setIsOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setSpecialisation('');
      setSlotDurationMinutes(30);
      fetchDoctors();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create doctor account');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Doctor Management
          </h1>
          <p className="text-slate-400 mt-1">Admin dashboard for creating and managing doctor accounts.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-lg text-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Doctor</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900/40 border border-slate-800 rounded-xl">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="bg-slate-950 text-xs uppercase text-slate-350 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Specialisation</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Slot Duration</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => {
                const profile = doctor.doctorProfile || doctor.profile;
                return (
                  <tr key={doctor.id} className="border-b border-slate-850 hover:bg-slate-900/20 transition-all">
                    <td className="px-6 py-4 font-bold text-white flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-xs">
                        {doctor.name.charAt(0)}
                      </div>
                      <span>{doctor.name}</span>
                    </td>
                    <td className="px-6 py-4">{profile?.specialisation || 'N/A'}</td>
                    <td className="px-6 py-4">{doctor.email}</td>
                    <td className="px-6 py-4 flex items-center space-x-1 mt-1">
                      <Clock className="h-3.5 w-3.5 text-teal-500" />
                      <span>{profile?.slotDurationMinutes || 30} mins</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Doctor Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Register New Doctor">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Doctor's Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Sarah Chen"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah.chen@healthcare.app"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Temp Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Specialisation</label>
              <input
                type="text"
                required
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
                placeholder="Cardiology"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Slot Duration (Mins)</label>
              <select
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              >
                <option value={15}>15 Mins</option>
                <option value={20}>20 Mins</option>
                <option value={30}>30 Mins</option>
                <option value={45}>45 Mins</option>
                <option value={60}>60 Mins</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-white font-semibold rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-lg text-sm transition-all"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
