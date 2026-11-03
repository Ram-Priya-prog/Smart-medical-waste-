import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { 
  ShieldCheck, 
  Truck, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Building2,
  Phone
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import PriorityBadge from '../../components/common/PriorityBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import toast from 'react-hot-toast';

export const AdminAssignCollectorModal = ({ pickup, isOpen, onClose, onAssigned }) => {
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollectorId, setSelectedCollectorId] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (pickup && isOpen) {
      fetchNearbyCollectors();
    }
  }, [pickup, isOpen]);

  const fetchNearbyCollectors = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/admin/collectors/nearby/${pickup.id}`);
      setCollectors(res.data);
      // Pre-select first available collector
      const firstAvail = res.data.find(c => c.is_available);
      if (firstAvail) {
        setSelectedCollectorId(firstAvail.id);
      } else if (res.data.length > 0) {
        setSelectedCollectorId(res.data[0].id);
      }
    } catch (e) {
      toast.error('Failed to calculate nearby collector distances.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedCollectorId) {
      toast.error('Please select an available collector.');
      return;
    }

    setAssigning(true);
    try {
      await apiClient.put(`/admin/pickups/${pickup.id}/assign`, {
        collector_id: selectedCollectorId
      });
      toast.success('Collector assigned successfully! Dispatch order sent to driver.');
      onAssigned();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Assignment failed.';
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  };

  if (!pickup) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Nearby Collector • PU-#${String(pickup.id).padStart(4, '0')}`}
      subtitle="Select a certified collector based on proximity and fleet availability"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Pickup Overview */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Facility:</span>
            <p className="font-bold text-slate-800 truncate">{pickup.hospital?.name || "Hospital Facility"}</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Waste:</span>
            <p className="font-bold text-slate-800">{pickup.waste_record?.quantity} kg ({pickup.waste_record?.category})</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Delay Risk:</span>
            <div><PriorityBadge delayRisk={pickup.delay_risk || pickup.priority} delayProbability={pickup.delay_probability || pickup.priority_confidence} size="sm" /></div>
          </div>
          <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-200/60 flex items-center gap-1.5 text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{pickup.pickup_address}</span>
          </div>
        </div>

        {/* Proximity List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Nearby Registered Collectors (Sorted by Haversine Distance)
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              {collectors.length} in Municipal Sector
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
              <p className="text-xs font-semibold">Calculating real-time fleet distances...</p>
            </div>
          ) : collectors.length > 0 ? (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {collectors.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setSelectedCollectorId(col.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCollectorId === col.id
                      ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      col.is_available ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-xs">{col.name}</p>
                        {col.is_available ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                            Busy on #PU-{col.active_pickup_id}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{col.phone}</span>
                        <span className="mx-1 text-slate-300">•</span>
                        <span>{col.address}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 font-black text-sm text-purple-700 bg-purple-100/70 px-2.5 py-1 rounded-lg">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{col.distance_km} km</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">approx. distance</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
              No registered collectors found in system database.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAssign}
            disabled={assigning || !selectedCollectorId}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {assigning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm Admin Dispatch</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminAssignCollectorModal;
