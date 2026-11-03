import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  UserCheck, 
  Building2, 
  MapPin, 
  Loader2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import DelayRiskBadge from '../../components/common/DelayRiskBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import AdminAssignCollectorModal from './AdminAssignCollectorModal';
import toast from 'react-hot-toast';

export const AdminPickupRequestsPage = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [delayRiskFilter, setDelayRiskFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPickups();
  }, [statusFilter, delayRiskFilter]);

  const fetchPickups = async () => {
    setLoading(true);
    try {
      let params = ['exclude_collected=false'];
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (delayRiskFilter) params.push(`delay_risk=${delayRiskFilter}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';

      const res = await apiClient.get(`/pickups${qs}`);
      setPickups(res.data);
    } catch (e) {
      toast.error('Failed to load pickup requests.');
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true);
  };

  const filteredPickups = pickups.filter(p =>
    !search ||
    p.hospital?.name.toLowerCase().includes(search.toLowerCase()) ||
    p.waste_record?.waste_type.toLowerCase().includes(search.toLowerCase()) ||
    p.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
    (p.collector?.name && p.collector.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Central Master Queue</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Medical Waste Pickup Requests</h1>
          <p className="text-xs text-slate-500">
            System-wide queue of hospital requests, ML delay risks, waiting durations, and manual collector assignments.
          </p>
        </div>

        <span className="text-xs font-bold bg-purple-50 text-purple-800 px-3.5 py-1.5 rounded-full border border-purple-200">
          {pickups.length} Total Registered Requests
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facility, waste, driver..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending Assignment</option>
            <option value="Assigned">Assigned to Driver</option>
            <option value="Accepted">Accepted & In Transit</option>
            <option value="Collected">Collected & Completed</option>
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

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Pickup ID</th>
                <th className="px-5 py-3.5">Hospital Facility</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Waste Item</th>
                <th className="px-5 py-3.5">Mass</th>
                <th className="px-5 py-3.5">ML Delay Risk</th>
                <th className="px-5 py-3.5">Wait Time</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Assigned Driver</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                    <p className="text-xs">Loading master queue...</p>
                  </td>
                </tr>
              ) : filteredPickups.length > 0 ? (
                filteredPickups.map((p) => {
                  const waitHrs = Math.max(0, ((new Date() - new Date(p.requested_at)) / (1000 * 3600))).toFixed(1);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">#PU-{String(p.id).padStart(4, '0')}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{p.hospital?.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{p.pickup_address}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <WasteCategoryBadge category={p.waste_record?.category} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">{p.waste_record?.waste_type}</td>
                      <td className="px-5 py-3.5 font-black text-slate-900">{p.waste_record?.quantity} kg</td>
                      <td className="px-5 py-3.5">
                        <DelayRiskBadge
                          delayRisk={p.delay_risk || p.priority}
                          delayProbability={p.delay_probability || p.priority_confidence}
                          size="sm"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{waitHrs}h wait</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {p.collector?.name ? (
                          <span className="font-bold text-slate-800">{p.collector.name}</span>
                        ) : (
                          <span className="text-amber-600 font-medium italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {p.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => openAssignModal(p)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Assign</span>
                          </button>
                        )}
                        {p.status === 'Assigned' && (
                          <button
                            type="button"
                            onClick={() => openAssignModal(p)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <span>Reassign</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="text-center py-8 text-slate-400">
                    No pickup requests matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminAssignCollectorModal
        pickup={selectedPickup}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssigned={fetchPickups}
      />
    </div>
  );
};

export default AdminPickupRequestsPage;
