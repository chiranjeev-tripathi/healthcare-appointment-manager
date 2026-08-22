import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`glass-card p-6 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);
