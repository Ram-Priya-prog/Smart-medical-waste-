import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Building2, 
  CheckCircle2, 
  Loader2,
  Calendar
} from 'lucide-react';
import DelayRiskBadge from '../../components/common/DelayRiskBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';

export const CollectorHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [delayRiskFilter, setDelayRiskFilter] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [categoryFilter, delayRiskFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let params = [];
      if (categoryFilter) params.push(`category=${categoryFilter}`);
      if (delayRiskFilter) params.push(`delay_risk=${delayRiskFilter}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';
      const res = await apiClient.get(`/history${qs}`);
      setHistory(res.data);
    } catch (err) {
      toast.error('Failed to load completed collection history.');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => 
    !search || 
    h.waste_record?.waste_type.toLowerCase().includes(search.toLowerCase()) ||
    (h.hospital?.name && h.hospital.name.toLowerCase().includes(search.toLowerCase())) ||
    h.pickup_address.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    if (filteredHistory.length === 0) {
      toast.error('No history records to export.');
      return;
    }
    const headers = ["Pickup ID", "Hospital", "Address", "Category", "Item", "Quantity (kg)", "ML Delay Risk", "Completed At"];
    const rows = filteredHistory.map(h => [
      `PU-${String(h.id).padStart(4, '0')}`,
      `"${h.hospital?.name || ''}"`,
      `"${h.pickup_address || ''}"`,
      h.waste_record?.category || '',
      `"${h.waste_record?.waste_type || ''}"`,
      h.waste_record?.quantity || 0,
      `"${h.delay_risk || h.priority}"`,
      h.completed_at || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `collector_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Collection manifest exported.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Driver Archive</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Completed Collections Log</h1>
          <p className="text-xs text-slate-500">
            Immutable log of all biomedical waste successfully collected by your fleet unit.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer w-fit"
        >
          <Download className="w-4 h-4" />
          <span>Export Manifest CSV</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facility, waste item, address..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
          >
            <option value="">All Categories</option>
            <option value="Yellow">Yellow (Infectious)</option>
            <option value="Red">Red (Contaminated Plastics)</option>
            <option value="White">White (Sharps)</option>
            <option value="Blue">Blue (Glassware)</option>
          </select>

          <select
            value={delayRiskFilter}
            onChange={(e) => setDelayRiskFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
          >
            <option value="">All Delay Risks</option>
            <option value="High">High Delay Risk</option>
            <option value="Medium">Medium Delay Risk</option>
            <option value="Low">Low Delay Risk</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Pickup ID</th>
                <th className="px-5 py-3.5">Hospital Facility</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Waste Item</th>
                <th className="px-5 py-3.5">Quantity</th>
                <th className="px-5 py-3.5">ML Delay Risk</th>
                <th className="px-5 py-3.5">Completed Time</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-xs">Loading records...</p>
                  </td>
                </tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">#PU-{String(h.id).padStart(4, '0')}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{h.hospital?.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <WasteCategoryBadge category={h.waste_record?.category} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{h.waste_record?.waste_type}</td>
                    <td className="px-5 py-3.5 font-extrabold text-slate-900">{h.waste_record?.quantity} kg</td>
                    <td className="px-5 py-3.5">
                      <DelayRiskBadge
                        delayRisk={h.delay_risk || h.priority}
                        delayProbability={h.delay_probability || h.priority_confidence}
                        size="sm"
                      />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {h.completed_at ? new Date(h.completed_at).toLocaleString() : 'Completed'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status="Collected" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">
                    No completed collections on record.
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

export default CollectorHistoryPage;
