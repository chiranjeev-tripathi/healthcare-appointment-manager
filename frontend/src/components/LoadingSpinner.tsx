import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-full w-full min-h-[200px]">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
    </div>
  </div>
);
