import React from 'react';

interface StatusBadgeProps {
  status?: string;
  urgency?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, urgency }) => {
  if (status) {
    const colors: Record<string, string> = {
      HELD: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse',
      BOOKED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      CANCELLED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
    const c = colors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${c}`}>{status}</span>;
  }
  
  if (urgency) {
    const colors: Record<string, string> = {
      LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      HIGH: 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
    };
    const c = colors[urgency] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${c}`}>{urgency}</span>;
  }
  
  return null;
};
