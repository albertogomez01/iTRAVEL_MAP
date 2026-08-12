import React from 'react';

export const GlassPopup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="glass-modal p-2 rounded-2xl shadow-md">{children}</div>;
};
