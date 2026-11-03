import React from 'react';
import { Biohazard, Sparkles, Syringe, TestTube } from 'lucide-react';

export const WasteCategoryBadge = ({ category, showDescription = false, size = 'md' }) => {
  const cat = category || 'Yellow';

  const configs = {
    Yellow: {
      label: 'Yellow (Infectious/Anatomical)',
      short: 'Yellow',
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-800',
      tagBg: 'bg-yellow-500',
      icon: Biohazard,
      desc: 'Anatomical, soiled dressings, expired meds'
    },
    Red: {
      label: 'Red (Contaminated Plastics)',
      short: 'Red',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      tagBg: 'bg-red-500',
      icon: TestTube,
      desc: 'Gloves, IV tubes, catheters, urine bags'
    },
    White: {
      label: 'White (Sharps & Blades)',
      short: 'White',
      bg: 'bg-slate-100',
      border: 'border-slate-300',
      text: 'text-slate-800',
      tagBg: 'bg-slate-500',
      icon: Syringe,
      desc: 'Needles, scalpels, surgical blades'
    },
    Blue: {
      label: 'Blue (Glassware & Implants)',
      short: 'Blue',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      tagBg: 'bg-blue-500',
      icon: Sparkles,
      desc: 'Broken vials, ampoules, metallic implants'
    },
  };

  const config = configs[cat] || configs.Yellow;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5',
  };

  return (
    <div className="inline-flex flex-col">
      <span className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${config.bg} ${config.border} ${config.text} ${sizeClasses[size]}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${config.tagBg}`}></span>
        <Icon className="w-3.5 h-3.5 opacity-80" />
        <span>{showDescription ? config.label : config.short}</span>
      </span>
      {showDescription && (
        <span className="text-[11px] text-slate-500 mt-0.5 ml-1">{config.desc}</span>
      )}
    </div>
  );
};

export default WasteCategoryBadge;
