import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  ShieldCheck, 
  Building2, 
  Truck, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Navigation, 
  Cpu, 
  BarChart3, 
  ArrowRight, 
  Loader2,
  AlertTriangle,
  UserCheck,
  MapPin
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import PriorityBadge from '../../components/common/PriorityBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import AdminAssignCollectorModal from './AdminAssignCollectorModal';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';

export const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [pendingPickups, setPendingPickups] = useState([]);
  const [activePickups, setActivePickups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assign Collector Modal state
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [ovRes, catRes, priRes, statRes, pendRes, actRes] = await Promise.all([
        apiClient.get('/analytics/overview'),
        apiClient.get('/analytics/category-distribution'),
        apiClient.get('/analytics/pickup-delay-risk'),
        apiClient.get('/analytics/status-distribution'),
        apiClient.get('/pickups/pending'),
        apiClient.get('/pickups/active')
      ]);

      setOverview(ovRes.data);
      setCategories(catRes.data);
      setPriorities(priRes.data);
      setStatuses(statRes.data);
      setPendingPickups(pendRes.data);
      setActivePickups(actRes.data);
    } catch (e) {
      console.error("Error fetching admin dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (pickup) => {
    setSelectedPickup(pickup);
    setIsAssignModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-xs font-semibold uppercase">Aggregating State Medical Waste Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Central Directorate Authority</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">State Biohazard Control Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            System-wide oversight of healthcare facilities, collector fleets, ML priority queue, and nearby dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/ml-model"
            className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors flex items-center gap-1.5"
          >
            <Cpu className="w-4 h-4" />
            <span>ML Model Center</span>
          </Link>
          <Link
            to="/admin/tracking"
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Navigation className="w-4 h-4" />
            <span>Fleet GPS Live View</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Registered Hospitals"
          value={overview?.total_hospitals || 0}
          subtitle="Healthcare facilities"
          icon={Building2}
          color="teal"
        />
        <StatCard
          title="Active Collector Fleet"
          value={overview?.total_collectors || 0}
          subtitle="Certified transport units"
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Pending Dispatches"
          value={overview?.pending_pickups || 0}
          subtitle="Needing Collector Assignment"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Safely Collected Mass"
          value={`${overview?.total_waste_collected_kg || 0} kg`}
          subtitle={`${overview?.completed_collections || 0} completed pickups`}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Pending Dispatches Action Queue (Crucial Admin Workflow) */}
      <div className="bg-white rounded-3xl p-6 border-2 border-purple-500/30 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Pending Collector Assignment Queue</h3>
              <p className="text-xs text-slate-500">
                Hospital requests waiting for Admin-assigned nearby certified collector.
              </p>
            </div>
          </div>

          <span className="text-xs font-black px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
            {pendingPickups.length} Action Required
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Pickup ID</th>
                <th className="px-4 py-3">Hospital Facility</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Waste Item</th>
                <th className="px-4 py-3">Mass</th>
                <th className="px-4 py-3">ML Delay Risk</th>
                <th className="px-4 py-3">Logged Time</th>
                <th className="px-4 py-3 text-right">Dispatch Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingPickups.length > 0 ? (
                pendingPickups.map((p) => (
                  <tr key={p.id} className="hover:bg-purple-50/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">#PU-{String(p.id).padStart(4, '0')}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{p.hospital?.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{p.pickup_address}</p>
                    </td>
                    <td className="px-4 py-3">
                      <WasteCategoryBadge category={p.waste_record?.category} size="sm" />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{p.waste_record?.waste_type}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{p.waste_record?.quantity} kg</td>
                    <td className="px-4 py-3">
                      <PriorityBadge
                        delayRisk={p.delay_risk || p.priority}
                        delayProbability={p.delay_probability || p.priority_confidence}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(p.requested_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openAssignModal(p)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign Nearby Collector</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-slate-400">
                    No pending pickup requests in queue. All requests have been assigned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waste by Category */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Total Mass by Waste Category</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="quantity_kg"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#0d9488'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} kg`, `${name} Category`]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            {categories.map(c => (
              <div key={c.category} className="flex justify-between items-center p-1.5 rounded bg-slate-50">
                <span className="font-semibold text-slate-700">{c.category}:</span>
                <span className="font-bold text-slate-900">{c.quantity_kg} kg</span>
              </div>
            ))}
          </div>
        </div>

        {/* ML Delay Risk Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-900">ML Delay Risk Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorities}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="risk_level" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${value} Requests`, 'Volume']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-center">
            {priorities.map(p => (
              <div key={p.risk_level || p.priority} className="p-1.5 rounded bg-slate-50">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{p.risk_level || p.priority}</p>
                <p className="text-xs font-black text-slate-800">{p.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pickup Lifecycle Status Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Pickup Lifecycle Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statuses} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  formatter={(value) => [`${value} Pickups`, 'Total']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
            <Link to="/admin/pickups" className="font-bold text-purple-600 hover:underline">
              Manage All Pickup Requests →
            </Link>
          </div>
        </div>
      </div>

      {/* Assign Collector Modal */}
      <AdminAssignCollectorModal
        pickup={selectedPickup}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssigned={fetchAdminData}
      />
    </div>
  );
};

export default AdminDashboard;
