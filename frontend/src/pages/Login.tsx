import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { authService } from '../services/auth.service';
import { Activity, Shield, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      loginStore(response);
      toast.success('Logged in successfully!');
      
      // Redirect based on role
      switch (response.role) {
        case 'PATIENT':
          navigate('/patient/doctors');
          break;
        case 'DOCTOR':
          navigate('/doctor/dashboard');
          break;
        case 'ADMIN':
          navigate('/admin/health');
          break;
        default:
          navigate('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-950 text-white">
      {/* Left side: Branding & Visuals */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 relative overflow-hidden border-r border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(13,148,136,0.1),transparent)]" />
        <div className="flex items-center space-x-3 z-10">
          <Activity className="h-8 w-8 text-teal-400 animate-pulse" />
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            CareFlow
          </span>
        </div>
        
        <div className="space-y-6 z-10 max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Healthcare booking, simplified.
          </h1>
          <p className="text-slate-400 leading-relaxed">
            Access certified healthcare experts, manage symptom profiles, receive automated schedules, and connect your Google Calendar in one dashboard.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-sm text-slate-500 z-10">
          <Shield className="h-4 w-4 text-teal-500" />
          <span>HIPAA Compliant & Secured Platform</span>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 glass p-8 rounded-2xl border border-slate-800">
          <div className="text-center">
            <LogIn className="mx-auto h-12 w-12 text-teal-400" />
            <h2 className="mt-6 text-3xl font-extrabold text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-400">Sign in to manage appointments</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-md">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 border border-transparent rounded-lg text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200 transform hover:scale-[1.01]"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-4">
            <span className="text-sm text-slate-400">New patient? </span>
            <Link to="/register" className="text-sm font-bold text-teal-400 hover:text-teal-300">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
