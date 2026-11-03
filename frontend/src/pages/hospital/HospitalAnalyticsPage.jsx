import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { 
  BarChart3, 
  Trash2, 
  CheckCircle2, 
  TrendingUp, 
  PieChart as PieIcon, 
  Loader2,
  Calendar
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
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

export const HospitalAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trends, setTrends] = useState([]);
  const [priorities, setPriorities] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [ovRes, catRes, trRes, priRes] = await Promise.all([
        apiClient.get('/analytics/overview'),
        apiClient.get('/analytics/category-distribution'),
        apiClient.get('/analytics/waste-trends'),
        apiClient.get('/analytics/pickup-delay-risk')
      ]);

      setOverview(ovRes.data);
      setCategories(catRes.data);
      setTrends(trRes.data);
      setPriorities(priRes.data);
    } catch (e) {
      console.error("Error loading analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-xs font-semibold uppercase">Computing Facility Waste Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Facility Audits & Trends</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mt-1">Hospital Waste Analytics</h1>
        <p className="text-xs text-slate-500">
          Analytics based solely on biomedical records logged by your healthcare facility.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Recorded Volume"
          value={`${overview?.total_waste_recorded_kg || 0} kg`}
          subtitle="Cumulative waste logged"
          icon={Trash2}
          color="teal"
        />
        <StatCard
          title="Safely Collected Volume"
          value={`${overview?.total_waste_collected_kg || 0} kg`}
          subtitle="Processed by certified fleet"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Completed Dispatches"
          value={overview?.completed_collections || 0}
          subtitle="Completed pickup cycles"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Segregation by Color Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="quantity_kg"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            {categories.map(c => (
              <div key={c.category} className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{c.category}</p>
                <p className="text-xs font-bold text-slate-800">{c.quantity_kg} kg</p>
                <p className="text-[10px] text-teal-600 font-semibold">{c.percentage}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delay Risk Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-900">ML Pickup Delay Risk Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorities}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="risk_level" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${value} Pickups`, 'Total Dispatches']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            {priorities.map(p => (
              <div key={p.risk_level || p.priority} className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{(p.risk_level || p.priority)} Risk</p>
                <p className="text-xs font-bold text-slate-800">{p.count} Pickups</p>
                <p className="text-[10px] text-teal-600 font-semibold">{p.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalAnalyticsPage;
