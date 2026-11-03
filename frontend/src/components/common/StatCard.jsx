import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'teal', trend }) => {
  const colorSchemes = {
    teal: {
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      border: 'border-teal-100',
      indicator: 'bg-teal-500'
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
      indicator: 'bg-blue-500'
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
      indicator: 'bg-rose-500'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      indicator: 'bg-amber-500'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      indicator: 'bg-emerald-500'
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-100',
      indicator: 'bg-indigo-500'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.teal;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft hover:shadow-card transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${scheme.bg} ${scheme.text} border ${scheme.border}`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
          <span>{subtitle}</span>
          {trend && <span className="font-semibold text-teal-600">{trend}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
