import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

export const DelayRiskBadge = ({
  delayRisk,
  risk,
  priority,
  delayProbability,
  confidence,
  showIcon = true,
  size = 'md',
  showProbability = true
}) => {
  const raw = String(delayRisk || risk || priority || 'Medium').toUpperCase();
  const prob = delayProbability !== undefined ? delayProbability : confidence;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  };

  if (raw.includes('HIGH')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-sm ${sizeClasses[size]}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
        </span>
        {showIcon && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
        <span>HIGH DELAY RISK</span>
        {showProbability && prob !== undefined && prob !== null && (
          <span className="text-[10px] text-rose-500 font-normal">
            ({(prob * 100).toFixed(0)}% delay risk)
          </span>
        )}
      </span>
    );
  }

  if (raw.includes('MEDIUM')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-sm ${sizeClasses[size]}`}>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
        <span>MEDIUM DELAY RISK</span>
        {showProbability && prob !== undefined && prob !== null && (
          <span className="text-[10px] text-amber-600 font-normal">
            ({(prob * 100).toFixed(0)}% delay risk)
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ${sizeClasses[size]}`}>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      {showIcon && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
      <span>LOW DELAY RISK</span>
      {showProbability && prob !== undefined && prob !== null && (
        <span className="text-[10px] text-emerald-500 font-normal">
          ({(prob * 100).toFixed(0)}% delay risk)
        </span>
      )}
    </span>
  );
};

// Aliases for seamless backward compatibility
export const PriorityBadge = DelayRiskBadge;
export default DelayRiskBadge;
