import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  CalendarPlus, 
  Cpu, 
  Clock, 
  ArrowRight, 
  AlertCircle, 
  Loader2,
  Trash2,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import DelayRiskBadge from '../../components/common/DelayRiskBadge';
import toast from 'react-hot-toast';

export const SchedulePickupPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('waste_id');

  const [unscheduledRecords, setUnscheduledRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(preselectedId ? parseInt(preselectedId) : null);
  const [storageHours, setStorageHours] = useState(12.0);
  const [pickupAddress, setPickupAddress] = useState('');
  const [preferredTimeWindow, setPreferredTimeWindow] = useState('09:00 - 13:00');
  const [timeWindowStartMin, setTimeWindowStartMin] = useState(60);
  const [timeWindowEndMin, setTimeWindowEndMin] = useState(300);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ML Live Delay Risk Preview state
  const [previewML, setPreviewML] = useState(null);
  const [predicting, setPredicting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchUnscheduledWaste();
  }, []);

  const fetchUnscheduledWaste = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/waste?scheduled=false');
      setUnscheduledRecords(res.data);
      if (res.data.length > 0 && !selectedRecordId) {
        setSelectedRecordId(res.data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load unscheduled waste records.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRecord = unscheduledRecords.find(r => r.id === selectedRecordId);

  // Live ML Delay Risk Prediction on selection or storage time change
  useEffect(() => {
    if (!selectedRecord) {
      setPreviewML(null);
      return;
    }

    const runMLPrediction = async () => {
      setPredicting(true);
      try {
        const res = await apiClient.post('/ml/predict-delay-risk', {
          waste_category: selectedRecord.category,
          waste_quantity: selectedRecord.quantity,
          storage_duration_hours: parseFloat(storageHours) || 12.0,
          request_waiting_hours: 1.0,
          pickup_distance_km: 5.0
        });
        setPreviewML(res.data);
      } catch (e) {
        console.error("ML preview error:", e);
      } finally {
        setPredicting(false);
      }
    };

    const timeout = setTimeout(runMLPrediction, 300);
    return () => clearTimeout(timeout);
  }, [selectedRecordId, storageHours]);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecordId) {
      toast.error('Please select a waste record to schedule.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        waste_record_id: selectedRecordId,
        storage_duration_hours: parseFloat(storageHours) || 12.0,
        pickup_address: pickupAddress.trim() || undefined,
        preferred_time_window: preferredTimeWindow,
        time_window_start_min: timeWindowStartMin,
        time_window_end_min: timeWindowEndMin
      };

      const res = await apiClient.post('/pickups', payload);
      const riskText = res.data.delay_risk || res.data.priority || 'Medium';
      toast.success(`Pickup Request #PU-${String(res.data.id).padStart(4, '0')} Created with ${riskText} Delay Risk!`);
      navigate('/hospital/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to schedule pickup request.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-xs font-semibold uppercase">Loading available waste batches...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Dispatch Request Portal</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mt-1">Schedule Medical Waste Pickup</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Select stored biomedical waste batches. The ML engine will evaluate logistical delay risk to assist proactive mitigation, while central Admin manually assigns certified collectors.
        </p>
      </div>

      {unscheduledRecords.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-soft text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Unscheduled Waste Batches in Storage</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All currently recorded biomedical waste has already been scheduled or collected.
            </p>
          </div>
          <Link
            to="/hospital/waste"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Record New Waste Batch First</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleScheduleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Select Waste Batch */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
                  1. Select Stored Waste Batch *
                </h3>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {unscheduledRecords.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRecordId(r.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedRecordId === r.id
                          ? 'bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800">#WR-{String(r.id).padStart(4, '0')}</span>
                          <WasteCategoryBadge category={r.category} size="sm" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">{r.waste_type}</p>
                        {r.notes && <p className="text-[11px] text-slate-500 truncate max-w-md">{r.notes}</p>}
                      </div>

                      <div className="text-right">
                        <p className="text-base font-black text-slate-900">{r.quantity} {r.unit}</p>
                        <p className="text-[10px] text-slate-400">
                          Logged: {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Storage Parameters */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
                  2. Operational Dispatch Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Current Storage Duration (Hours) *
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="168"
                        required
                        value={storageHours}
                        onChange={(e) => setStorageHours(e.target.value)}
                        placeholder="e.g. 18.0"
                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Preferred Collection Time Window *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: 'Morning (08:00 - 12:00)', value: '08:00 - 12:00', start: 0, end: 240 },
                        { label: 'Midday (10:00 - 14:00)', value: '10:00 - 14:00', start: 120, end: 360 },
                        { label: 'Afternoon (12:00 - 16:00)', value: '12:00 - 16:00', start: 240, end: 480 },
                        { label: 'Evening (14:00 - 18:00)', value: '14:00 - 18:00', start: 360, end: 600 },
                        { label: 'Standard (09:00 - 13:00)', value: '09:00 - 13:00', start: 60, end: 300 },
                        { label: 'Full Day (08:00 - 18:00)', value: '08:00 - 18:00', start: 0, end: 600 }
                      ].map((slot) => (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => {
                            setPreferredTimeWindow(slot.value);
                            setTimeWindowStartMin(slot.start);
                            setTimeWindowEndMin(slot.end);
                          }}
                          className={`px-3 py-2 text-xs rounded-xl border text-left font-semibold transition-all ${
                            preferredTimeWindow === slot.value
                              ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-xs ring-2 ring-teal-400/20'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${preferredTimeWindow === slot.value ? 'text-teal-600' : 'text-slate-400'}`} />
                            <span className="truncate">{slot.value}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Used by Google OR-Tools multi-stop optimizer to construct time-feasible logistics routes.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Pickup Bay / Loading Gate (Optional)
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        placeholder="Leave blank to use registered facility address"
                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live ML Delay Risk Preview & Submit */}
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">ML Delay Risk Preview</h3>
                    <p className="text-[10px] text-slate-500">Random Forest Classifier</p>
                  </div>
                </div>

                {selectedRecord && previewML ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500">Predicted Delay Risk</p>
                      <div className="flex justify-center">
                        <DelayRiskBadge
                          delayRisk={previewML.delay_risk || previewML.risk_level || previewML.priority}
                          delayProbability={previewML.delay_probability || previewML.confidence}
                          size="lg"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Delay Likelihood: {((previewML.delay_probability ?? previewML.confidence ?? 0) * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <p className="font-bold text-slate-700 text-[11px] uppercase">Probability Distribution</p>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-600">Delayed</span>
                            <span className="font-bold text-rose-600">
                              {((previewML.delay_probability ?? previewML.probabilities?.Delayed ?? 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-rose-500 transition-all duration-300"
                              style={{ width: `${(previewML.delay_probability ?? previewML.probabilities?.Delayed ?? 0) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-600">On-Time</span>
                            <span className="font-bold text-emerald-600">
                              {((1 - (previewML.delay_probability ?? 0.5)) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${(1 - (previewML.delay_probability ?? 0.5)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    {predicting ? 'Predicting delay risk...' : 'Select a waste batch to preview classification'}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedRecordId}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Pickup Request</span>}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default SchedulePickupPage;
