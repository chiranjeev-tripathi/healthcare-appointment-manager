import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = <FolderOpen size={48} className="text-slate-500" />, 
  title, 
  description,
  action 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center glass-card border-dashed border-2 border-slate-700/50">
      <div className="mb-4 bg-surface/50 p-4 rounded-full">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
