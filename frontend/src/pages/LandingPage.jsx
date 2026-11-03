import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  ShieldCheck, 
  Truck, 
  Building2, 
  MapPin, 
  Cpu, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Biohazard,
  Sparkles,
  Syringe,
  TestTube,
  Clock,
  Radio,
  Lock
} from 'lucide-react';
import PriorityBadge from '../components/common/PriorityBadge';
import WasteCategoryBadge from '../components/common/WasteCategoryBadge';

export const LandingPage = () => {
  const steps = [
    { num: '01', title: 'Hospital Records Waste', desc: 'Category (Yellow, Red, White, Blue), quantity in kg, and safe storage details logged in SQLite.', icon: Building2 },
    { num: '02', title: 'Pickup Request & ML Delay Risk', desc: 'Random Forest model predicts delay probability based on biohazard risk, storage time, transit distance, and collector availability.', icon: Cpu },
    { num: '03', title: 'Admin Dispatches Nearby Fleet', desc: 'System calculates Haversine proximity to available collectors. Admin assigns the optimal certified collector.', icon: ShieldCheck },
    { num: '04', title: 'Collector Accepts & Live GPS', desc: 'Assigned collector accepts on mobile/browser. Live GPS streams to Hospital and Admin via WebSocket.', icon: Truck },
    { num: '05', title: 'Safe Collection & History', desc: 'Collector completes pickup. GPS stops immediately. Records update to immutable Collection History & Analytics.', icon: CheckCircle2 },
  ];

  const wasteCategories = [
    {
      cat: 'Yellow',
      title: 'Infectious & Anatomical Waste',
      color: 'bg-yellow-500',
      border: 'border-yellow-200',
      bg: 'bg-yellow-50/70',
      text: 'text-yellow-900',
      examples: 'Human anatomical tissues, organs, soiled cotton bandages, expired medicines, microbiology cultures',
      handling: 'High biohazard priority • Yellow non-chlorinated bags'
    },
    {
      cat: 'Red',
      title: 'Contaminated Recyclable Plastics',
      color: 'bg-red-500',
      border: 'border-red-200',
      bg: 'bg-red-50/70',
      text: 'text-red-900',
      examples: 'Contaminated disposable gloves, IV tubing sets, urine bags, catheters, syringes without needles',
      handling: 'Autoclaving / Sterilization • Red puncture-resistant bins'
    },
    {
      cat: 'White',
      title: 'Sharps, Blades & Needles',
      color: 'bg-slate-500',
      border: 'border-slate-300',
      bg: 'bg-slate-50',
      text: 'text-slate-900',
      examples: 'Hypodermic needles, scalpels, contaminated surgical blades, fixed-needle syringes',
      handling: 'High puncture risk • White puncture-proof sealed containers'
    },
    {
      cat: 'Blue',
      title: 'Glassware & Metallic Implants',
      color: 'bg-blue-500',
      border: 'border-blue-200',
      bg: 'bg-blue-50/70',
      text: 'text-blue-900',
      examples: 'Broken medicine ampoules, glass vials, metallic orthopedic implants and pins',
      handling: 'Disinfection & Glass Recycling • Blue cardboard / plastic boxes'
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 rounded-3xl bg-gradient-to-b from-teal-50/80 via-white to-slate-50 border border-teal-100/80 px-6 sm:px-12">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Smart Medical Waste <br />
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Collection & Dispatch System
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            A digital platform connecting healthcare facilities and waste collectors for efficient medical-waste recording, pickup scheduling, admin-controlled collector assignment, live tracking, and machine-learning-based pickup priority prediction.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-600/25 transition-all hover:scale-102 flex items-center gap-2"
            >
              <span>Access System Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register/hospital"
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-300 shadow-xs transition-all hover:border-slate-400"
            >
              Register Healthcare Facility
            </Link>
            
            <Link
              to="/register/collector"
              className="px-6 py-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-sm border border-cyan-200 shadow-xs transition-all"
            >
              Register Collector Fleet
            </Link>
          </div>

          {/* Quick Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto border-t border-slate-200/60 text-left">
            <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Roles Supported</p>
              <p className="text-sm font-bold text-slate-800">Hospital • Collector • Admin</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">ML Model</p>
              <p className="text-sm font-bold text-teal-700">Random Forest Classifier</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Assignment Rule</p>
              <p className="text-sm font-bold text-slate-800">Admin-Controlled Nearby</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Live Telemetry</p>
              <p className="text-sm font-bold text-cyan-700">WebSocket GPS Streams</p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">End-to-End Architecture</p>
          <h2 className="text-3xl font-extrabold text-slate-900">How the Digital System Operates</h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            A strictly governed lifecycle ensuring biohazard safety, non-repudiation, automated ML urgency classification, and administrative dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.num}
                className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-soft hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      STEP {step.num}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1.5">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
                {idx < 4 && (
                  <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Biomedical Waste Categories */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">Standard Compliance</p>
          <h2 className="text-3xl font-extrabold text-slate-900">Biomedical Waste Color Segregation</h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Categorized strictly per national biomedical waste management regulations for infection control and safe transport.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {wasteCategories.map((cat) => (
            <div
              key={cat.cat}
              className={`p-5 rounded-2xl border ${cat.border} ${cat.bg} shadow-soft flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-3.5 h-3.5 rounded-full ${cat.color}`}></span>
                  <span className="text-sm font-extrabold text-slate-800">{cat.cat} Category</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{cat.title}</h3>
                <p className="text-xs text-slate-700 mb-3 leading-relaxed">
                  <span className="font-semibold text-slate-800">Examples: </span>
                  {cat.examples}
                </p>
              </div>
              <div className="border-t border-slate-200/60 pt-2.5 text-[11px] font-medium text-slate-600">
                {cat.handling}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ML Priority & Admin Assignment Highlight */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* ML Delay Risk Explanation */}
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-soft space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">ML Pickup Delay Risk Prediction</h3>
              <p className="text-xs text-slate-500">Trained Random Forest Classification Model (is_delayed = 0 or 1)</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Instead of static queue priorities, our built-in Scikit-learn Random Forest model calculates a multidimensional delay probability based on 10 critical operational delay drivers:
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">Biohazard Risk & Volume</span>
              <span className="text-slate-500">Yellow/White (Risk 4) + &gt;50kg batches elevate delay hazard</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">Storage & Waiting Duration</span>
              <span className="text-slate-500">Accumulated queue wait time directly elevates delay probability</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">Collector Scarcity & Distance</span>
              <span className="text-slate-500">Low local collector availability is the strongest delay predictor</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <PriorityBadge delayRisk="High" delayProbability={0.78} size="md" />
            <PriorityBadge delayRisk="Medium" delayProbability={0.48} size="md" />
            <PriorityBadge delayRisk="Low" delayProbability={0.18} size="md" />
          </div>
        </div>

        {/* Admin Assignment Rule */}
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-soft space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Admin-Controlled Assignment</h3>
              <p className="text-xs text-slate-500">Dynamic Proximity Dispatching Rule</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Hospitals do not permanently bind or privately select collectors. The Central Admin maintains total operational transparency:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                <strong>Dynamic Haversine Proximity:</strong> When a request is logged, the system computes exact distances from the hospital to all registered collector units.
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>
                <strong>Single Point of Authority:</strong> Admin evaluates collector availability, distance, and ML delay risk before manually assigning the dispatch order.
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <span>
                <strong>Multi-Hospital Fleet Flexibility:</strong> Collectors serve different clinics dynamically based on proximity and urgency.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 pt-8 text-center text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-700">
          Smart Medical-Waste Collection System • Full-Stack Web Application + ML Pickup Delay Risk Prediction
        </p>
        <p>
          Built with React.js, Tailwind CSS, FastAPI, SQLite SQLAlchemy, Scikit-learn Random Forest, and WebSockets.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
