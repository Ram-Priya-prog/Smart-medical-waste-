import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { 
  MapPin, 
  Navigation, 
  Building2, 
  Truck, 
  Radio, 
  Phone, 
  Clock, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import PriorityBadge from '../../components/common/PriorityBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import LiveTrackingMap from '../../components/maps/LiveTrackingMap';

export const AdminLiveTrackingPage = () => {
  const [activeFleet, setActiveFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPickup, setSelectedPickup] = useState(null);

  useEffect(() => {
    fetchActiveTracking();
    const interval = setInterval(fetchActiveTracking, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTracking = async () => {
    try {
      const res = await apiClient.get('/admin/active-tracking');
      setActiveFleet(res.data);
      if (res.data.length > 0 && !selectedPickup) {
        setSelectedPickup(res.data[0]);
      } else if (res.data.length > 0 && selectedPickup) {
        const updated = res.data.find(p => p.pickup_id === selectedPickup.pickup_id);
        if (updated) setSelectedPickup(updated);
      }
    } catch (e) {
      console.error('Error loading active tracking:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-xs font-semibold uppercase">Connecting Satellite Fleet Command...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Central Satellite Radar</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Live Fleet Tracking & Telemetry</h1>
          <p className="text-xs text-slate-500">
            Real-time GPS coordinates of all active biomedical waste vehicles currently on mission.
          </p>
        </div>

        <div className="text-xs font-bold bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{activeFleet.length} Active Vehicles En Route</span>
        </div>
      </div>

      {activeFleet.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Missions List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Active Dispatches ({activeFleet.length})
            </h3>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {activeFleet.map((f) => (
                <div
                  key={f.pickup_id}
                  onClick={() => setSelectedPickup(f)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    selectedPickup?.pickup_id === f.pickup_id
                      ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">
                      PU-#{String(f.pickup_id).padStart(4, '0')}
                    </span>
                    <PriorityBadge delayRisk={f.delay_risk || f.priority} delayProbability={f.delay_probability} size="sm" />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{f.hospital?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mt-1">
                      <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{f.collector?.name}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                    <WasteCategoryBadge category={f.waste_category} size="sm" />
                    <span className="font-bold text-slate-800">{f.quantity} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Map for Selected Mission */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPickup && (
              <>
                <LiveTrackingMap
                  hospitalLat={selectedPickup.hospital?.latitude}
                  hospitalLng={selectedPickup.hospital?.longitude}
                  hospitalName={selectedPickup.hospital?.name || "Hospital"}
                  hospitalAddress={selectedPickup.hospital?.address}
                  collectorLat={selectedPickup.collector?.current_latitude}
                  collectorLng={selectedPickup.collector?.current_longitude}
                  collectorName={selectedPickup.collector?.name || "Collector"}
                  collectorPhone={selectedPickup.collector?.phone || ""}
                  height="450px"
                />

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-soft grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Driver Phone:</span>
                    <p className="font-bold text-slate-800">{selectedPickup.collector?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Facility Phone:</span>
                    <p className="font-bold text-slate-800">{selectedPickup.hospital?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Accepted Time:</span>
                    <p className="font-bold text-slate-800">
                      {selectedPickup.accepted_at ? new Date(selectedPickup.accepted_at).toLocaleTimeString() : "Recently"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Consignment:</span>
                    <p className="font-bold text-slate-800">{selectedPickup.quantity} kg ({selectedPickup.waste_category})</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-soft text-center text-slate-400 space-y-3">
          <Navigation className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Fleet Vehicles Currently in Transit</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When a collector accepts an assigned dispatch, the vehicle will appear here on the real-time satellite radar with active telemetry.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminLiveTrackingPage;
