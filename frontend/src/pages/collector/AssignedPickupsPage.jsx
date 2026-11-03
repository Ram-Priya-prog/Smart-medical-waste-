import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  ClipboardList, 
  Building2, 
  MapPin, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import PriorityBadge from '../../components/common/PriorityBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';

export const AssignedPickupsPage = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAssigned();
  }, []);

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/collector/pickups/assigned');
      setPickups(res.data);
    } catch (e) {
      toast.error('Failed to load assigned pickups.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    setAcceptingId(id);
    try {
      await apiClient.put(`/collector/pickups/${id}/accept`);
      toast.success(`Pickup #PU-${String(id).padStart(4, '0')} Accepted! GPS Tracking started.`);
      navigate('/collector/active-pickup');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to accept pickup.';
      toast.error(msg);
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold uppercase">Loading Assigned Dispatches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Dispatch Queue</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Assigned Pickup Requests</h1>
          <p className="text-xs text-slate-500">
            Medical waste collection requests specifically assigned to you by the Central Admin.
          </p>
        </div>

        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
          {pickups.length} Assigned Waiting Acceptance
        </span>
      </div>

      {pickups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pickups.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">
                    PU-#{String(p.id).padStart(4, '0')}
                  </span>
                  <PriorityBadge
                    delayRisk={p.delay_risk || p.priority}
                    delayProbability={p.delay_probability || p.priority_confidence}
                    size="sm"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{p.hospital?.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{p.pickup_address}</span>
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Waste:</span>
                    <WasteCategoryBadge category={p.waste_record?.category} size="sm" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Item:</span>
                    <span className="font-bold text-slate-800">{p.waste_record?.waste_type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Mass:</span>
                    <span className="font-black text-slate-900 text-sm">{p.waste_record?.quantity} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>Assigned:</span>
                    <span>{new Date(p.assigned_at || p.requested_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAccept(p.id)}
                disabled={acceptingId === p.id}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {acceptingId === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Accept & Begin Route</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-soft text-center text-slate-400 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">You're All Caught Up</h3>
          <p className="text-xs text-slate-500">No new pickup requests assigned to you at this moment.</p>
        </div>
      )}
    </div>
  );
};

export default AssignedPickupsPage;
