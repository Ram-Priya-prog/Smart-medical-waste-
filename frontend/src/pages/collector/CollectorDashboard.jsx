import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  Truck, 
  ClipboardList, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Building2, 
  MapPin, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  Phone,
  Radio
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import PriorityBadge from '../../components/common/PriorityBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';

export const CollectorDashboard = () => {
  const [assignedPickups, setAssignedPickups] = useState([]);
  const [activePickup, setActivePickup] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCollectorData();
  }, []);

  const fetchCollectorData = async () => {
    setLoading(true);
    try {
      const [assignedRes, activeRes, overviewRes] = await Promise.all([
        apiClient.get('/collector/pickups/assigned'),
        apiClient.get('/collector/active-pickup'),
        apiClient.get('/analytics/overview')
      ]);

      setAssignedPickups(assignedRes.data);
      setActivePickup(activeRes.data);
      setOverview(overviewRes.data);
    } catch (err) {
      console.error("Error loading collector dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPickup = async (pickupId) => {
    setAcceptingId(pickupId);
    try {
      await apiClient.put(`/collector/pickups/${pickupId}/accept`);
      toast.success(`Pickup #PU-${String(pickupId).padStart(4, '0')} Accepted! GPS Tracking Activated.`);
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
        <p className="text-xs font-semibold uppercase">Loading Collector Dispatch Schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Fleet Operations Desk</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Collector Field Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review Admin-assigned hospital pickups with ML priority classification and navigate active routes.
          </p>
        </div>

        {activePickup && (
          <Link
            to="/collector/active-pickup"
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-2"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Resume Active Pickup (#PU-{activePickup.id})</span>
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assigned Pickups"
          value={assignedPickups.length}
          subtitle="Waiting for your acceptance"
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          title="Active Pickup"
          value={activePickup ? 'In Progress' : 'Idle / Ready'}
          subtitle={activePickup ? `Driving to ${activePickup.hospital?.name}` : 'Ready for next dispatch'}
          icon={Navigation}
          color={activePickup ? 'teal' : 'amber'}
        />
        <StatCard
          title="Completed Collections"
          value={overview?.completed_collections || 0}
          subtitle="Total waste consignments delivered"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Active Pickup Alert Banner if currently running */}
      {activePickup && (
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Navigation className="w-6 h-6 animate-spin-slow text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Live Dispatch Active
                </span>
                <span className="text-xs font-semibold">PU-#{String(activePickup.id).padStart(4, '0')}</span>
              </div>
              <h3 className="text-lg font-black mt-0.5">{activePickup.hospital?.name}</h3>
              <p className="text-xs text-teal-100">{activePickup.pickup_address}</p>
            </div>
          </div>

          <Link
            to="/collector/active-pickup"
            className="px-5 py-2.5 rounded-xl bg-white text-teal-800 font-extrabold text-xs shadow-md hover:bg-teal-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>Open GPS Navigation & Complete</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Assigned Pickups Section with PROMINENT ML PRIORITY */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Assigned Pickup Queue</h3>
            <p className="text-xs text-slate-500">
              Assigned to you by the Central Admin. 
            </p>
          </div>
          <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
            {assignedPickups.length} Assigned
          </span>
        </div>

        {assignedPickups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedPickups.map((pickup) => (
              <div
                key={pickup.id}
                className="bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">
                      PU-#{String(pickup.id).padStart(4, '0')}
                    </span>
                    {/* ML DELAY RISK BADGE */}
                    <PriorityBadge
                      delayRisk={pickup.delay_risk || pickup.priority}
                      delayProbability={pickup.delay_probability || pickup.priority_confidence}
                      size="md"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                      <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>{pickup.hospital?.name || "Hospital Facility"}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{pickup.pickup_address}</span>
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Waste Category:</span>
                      <WasteCategoryBadge category={pickup.waste_record?.category} size="sm" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Item:</span>
                      <span className="font-semibold text-slate-800">{pickup.waste_record?.waste_type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Quantity:</span>
                      <span className="font-black text-slate-900">{pickup.waste_record?.quantity} kg</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Assigned by Admin:</span>
                      <span>{new Date(pickup.assigned_at || pickup.requested_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAcceptPickup(pickup.id)}
                  disabled={acceptingId === pickup.id || activePickup !== null}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {acceptingId === pickup.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Accept Pickup & Start GPS</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <ClipboardList className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium">No pending dispatches assigned to your fleet account right now.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">The Admin assigns nearby hospital requests as they are logged.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectorDashboard;
