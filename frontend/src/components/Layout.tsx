import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { LogOut, Calendar, Users, Activity, Home } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    switch (user?.role) {
      case 'PATIENT':
        return [
          { label: 'Doctors', path: '/patient/doctors', icon: <Users size={20} /> },
          { label: 'My Appointments', path: '/patient/appointments', icon: <Calendar size={20} /> },
        ];
      case 'DOCTOR':
        return [
          { label: 'Dashboard', path: '/doctor/dashboard', icon: <Home size={20} /> },
          { label: 'Leave Management', path: '/doctor/leave', icon: <Calendar size={20} /> },
        ];
      case 'ADMIN':
        return [
          { label: 'System Health', path: '/admin/health', icon: <Activity size={20} /> },
          { label: 'Manage Doctors', path: '/admin/doctors', icon: <Users size={20} /> },
          { label: 'All Appointments', path: '/admin/appointments', icon: <Calendar size={20} /> },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-secondary to-surface">
      {/* Sidebar */}
      <aside className="w-64 glass flex flex-col h-full hidden md:flex border-r border-slate-700/50">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gradient">CareManager</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {getNavItems().map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname.startsWith(item.path)
                  ? 'bg-primary/20 text-primary-light border border-primary/30'
                  : 'text-slate-400 hover:bg-surface hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-slate-700/50">
          <div className="flex items-center space-x-3 px-4 py-3 bg-surface/50 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden glass p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-lg font-bold text-gradient">CareManager</h1>
          <button onClick={handleLogout} className="text-slate-400">
            <LogOut size={20} />
          </button>
        </div>
        
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
