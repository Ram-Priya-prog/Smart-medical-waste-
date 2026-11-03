import React from 'react';
import { Clock, UserCheck, Navigation, CheckCircle2, XCircle } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const s = status || 'Pending';

  const configs = {
    Pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Clock,
      label: 'Pending Assignment'
    },
    Assigned: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: UserCheck,
      label: 'Collector Assigned'
    },
    Accepted: {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
      icon: Navigation,
      label: 'Active Pickup / In Transit'
    },
    Collected: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      label: 'Collected & Disposed'
    },
    Cancelled: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: XCircle,
      label: 'Cancelled'
    },
  };

  const config = configs[s] || configs.Pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
