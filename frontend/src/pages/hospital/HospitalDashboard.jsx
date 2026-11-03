import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  Trash2, 
  Clock, 
  UserCheck, 
  Navigation, 
  CheckCircle2, 
  PlusCircle, 
  CalendarPlus, 
  ArrowRight,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Building2
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import PriorityBadge from '../../components/common/PriorityBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import LiveTrackingMap from '../../components/maps/LiveTrackingMap';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export const HospitalDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trends, setTrends] = useState([]);
  const [activePickup, setActivePickup] = useState(null);
  const [recentPickups, setRecentPickups] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [overviewRes, catRes, trendRes, activeRes, pickupsRes] = await Promise.all([
        apiClient.get('/analytics/overview'),
        apiClient.get('/analytics/category-distribution'),
        apiClient.get('/analytics/waste-trends'),
        apiClient.get('/pickups/active'),
        apiClient.get('/pickups?exclude_collected=false')
      ]);

      setOverview(overviewRes.data);
      setCategories(catRes.data);
      setTrends(trendRes.data);
      
      if (activeRes.data && activeRes.data.length > 0) {
        setActivePickup(activeRes.data[0]);
      } else {
        setActivePickup(null);
      }

      setRecentPickups(pickupsRes.data.slice(0, 5));
    } catch (err) {
      console.error("Error fetching hospital dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-xs font-semibold uppercase tracking-wider">Loading Hospital Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Hospital Facility Portal</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Medical Waste Management Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record biomedical batches, monitor ML delay risk predictions, and track collector fleet dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/hospital/waste"
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record New Waste</span>
          </Link>
          <Link
            to="/hospital/schedule"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Schedule Pickup</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Recorded Waste"
          value={`${overview?.total_waste_recorded_kg || 0} kg`}
          subtitle="All logged biomedical batches"
          icon={Trash2}
          color="teal"
        />
        <StatCard
          title="Pending Dispatches"
          value={overview?.pending_pickups || 0}
          subtitle="Awaiting Admin Collector Assignment"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Active Pickups"
          value={overview?.active_pickups || 0}
          subtitle="Collector In-Transit with Live GPS"
          icon={Navigation}
          color="blue"
        />
        <StatCard
          title="Completed Collections"
          value={overview?.completed_collections || 0}
          subtitle={`${overview?.total_waste_collected_kg || 0} kg safely processed`}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Active Pickup Section with Live Google/Leaflet Map */}
      {activePickup ? (
        <div className="bg-white p-6 rounded-3xl border-2 border-teal-500/40 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center">
                <Navigation className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Active Collection in Progress</h3>
                  <StatusBadge status="Accepted" />
                </div>
                <p className="text-xs text-slate-500">
                  Pickup #{activePickup.id} • Assigned Collector is en route to your facility.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PriorityBadge priority={activePickup.priority} confidence={activePickup.priority_confidence} />
              <Link
                to="/hospital/active-pickup"
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <span>Full GPS View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LiveTrackingMap
                hospitalLat={activePickup.hospital_latitude}
                hospitalLng={activePickup.hospital_longitude}
                hospitalName={activePickup.hospital?.name || "Hospital Facility"}
                hospitalAddress={activePickup.pickup_address}
                collectorLat={activePickup.collector?.latitude || activePickup.hospital_latitude + 0.008}
                collectorLng={activePickup.collector?.longitude || activePickup.hospital_longitude + 0.008}
                collectorName={activePickup.collector?.name || "Assigned Collector"}
                collectorPhone={activePickup.collector?.phone || ""}
                height="320px"
              />
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4 text-xs">
              <div className="space-y-3">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Dispatch Logistics</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Assigned Driver:</span>
                    <span className="font-bold text-slate-800">{activePickup.collector?.name || "Collector"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Contact Number:</span>
                    <span className="font-semibold text-teal-700">{activePickup.collector?.phone || "Available on dispatch"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Waste Category:</span>
                    <WasteCategoryBadge category={activePickup.waste_record?.category} size="sm" />
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Batch Quantity:</span>
                    <span className="font-bold text-slate-800">{activePickup.waste_record?.quantity} kg</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-teal-900 text-[11px] leading-relaxed">
                <strong>Protocol Reminder:</strong> Please ensure the waste bags are barcoded and verified by your Biohazard Incharge before handover.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">No Active Dispatches Currently In Transit</p>
              <p className="text-[11px] text-slate-500">
                Pickups accepted by assigned collectors will display live real-time GPS tracking here.
              </p>
            </div>
          </div>
          <Link
            to="/hospital/schedule"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
          >
            Schedule a Pickup →
          </Link>
        </div>
      )}

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Waste Generation by Category</h3>
              <p className="text-xs text-slate-500">Segregated mass volume (kg)</p>
            </div>
            <Link to="/hospital/analytics" className="text-xs font-semibold text-teal-600 hover:underline">
              View Analytics
            </Link>
          </div>

          <div className="h-64 flex items-center justify-center">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="quantity_kg"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
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
            ) : (
              <p className="text-xs text-slate-400">No waste generation recorded yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            {categories.map((c) => (
              <div key={c.category} className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{c.category}</span>
                <p className="text-xs font-bold text-slate-800">{c.quantity_kg} kg</p>
                <span className="text-[10px] text-teal-600 font-semibold">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Waste Generation Timeline Trends */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Waste Generation Timeline</h3>
              <p className="text-xs text-slate-500">Daily logged volumes</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Historical Trend
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip
                  formatter={(value) => [`${value} kg`, 'Waste Generated']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="quantity_kg" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Pickup Queue Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Pickup Requests & Predictions</h3>
          
          </div>
          <Link to="/hospital/history" className="text-xs font-bold text-teal-600 hover:underline">
            View Complete History →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Pickup ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Waste Type</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">ML Delay Risk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned Collector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentPickups.length > 0 ? (
                recentPickups.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">PU-{String(p.id).padStart(4, '0')}</td>
                    <td className="px-4 py-3">
                      <WasteCategoryBadge category={p.waste_record?.category} size="sm" />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 max-w-[200px] truncate">
                      {p.waste_record?.waste_type || 'Biomedical Waste'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">{p.waste_record?.quantity} kg</td>
                    <td className="px-4 py-3">
                      <PriorityBadge
                        delayRisk={p.delay_risk || p.priority}
                        delayProbability={p.delay_probability || p.priority_confidence}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.collector?.name ? (
                        <span className="font-semibold text-slate-800">{p.collector.name}</span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">Pending Admin Dispatch</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-400">
                    No pickup requests recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
