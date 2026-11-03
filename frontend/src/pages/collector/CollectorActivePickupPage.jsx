import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { 
  Navigation, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Building2, 
  Truck, 
  Radio, 
  Play, 
  Pause, 
  RotateCcw,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';
import PriorityBadge from '../../components/common/PriorityBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import LiveTrackingMap from '../../components/maps/LiveTrackingMap';
import toast from 'react-hot-toast';

export const CollectorActivePickupPage = () => {
  const { user } = useAuth();
  const [activePickup, setActivePickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Live GPS state
  const [collectorPos, setCollectorPos] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [watchId, setWatchId] = useState(null);

  // WebSocket reference
  const wsRef = useRef(null);
  const simIntervalRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivePickup();
    return () => {
      stopAllTracking();
    };
  }, []);

  const stopAllTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const fetchActivePickup = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/collector/active-pickup');
      if (res.data) {
        setActivePickup(res.data);
        // Initialize position slightly offset from hospital if not known
        const initialLat = user?.latitude || (res.data.hospital_latitude + 0.012);
        const initialLng = user?.longitude || (res.data.hospital_longitude + 0.012);
        setCollectorPos({ lat: initialLat, lng: initialLng });
        
        // Setup WebSocket & Geolocation
        setupWebSocket(res.data.id);
        startDeviceGPS(res.data.id);
      } else {
        setActivePickup(null);
      }
    } catch (e) {
      console.error('Error loading active pickup:', e);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = (pickupId) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/location/${pickupId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Collector WS] Connected to live location channel');
    };
  };

  // Broadcast coordinate to WebSocket & REST
  const sendLocationUpdate = (lat, lng, pickupId) => {
    setCollectorPos({ lat, lng });

    // 1. Send through WebSocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'LOCATION_UPDATE',
        pickup_id: pickupId,
        collector_id: user?.id,
        collector_name: user?.name,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString()
      }));
    }

    // 2. Persist via REST in background
    apiClient.post('/location/update', {
      pickup_id: pickupId,
      latitude: lat,
      longitude: lng
    }).catch(err => {
      // Background non-blocking update
    });
  };

  // Browser Geolocation watchPosition
  const startDeviceGPS = (pickupId) => {
    if ('geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isSimulating) {
            const lat = parseFloat(pos.coords.latitude.toFixed(6));
            const lng = parseFloat(pos.coords.longitude.toFixed(6));
            sendLocationUpdate(lat, lng, pickupId);
          }
        },
        (err) => {
          console.warn('[GPS Watch Warning]', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
      setWatchId(id);
    }
  };

  // GPS Simulation Mode (Allows 1-click test simulation of vehicle movement)
  const toggleSimulation = () => {
    if (!activePickup) return;

    if (isSimulating) {
      clearInterval(simIntervalRef.current);
      setIsSimulating(false);
      toast('Simulation paused.', { icon: '⏸️' });
    } else {
      setIsSimulating(true);
      toast.success('Simulation active! Collector vehicle moving toward clinic.');

      const targetLat = activePickup.hospital_latitude;
      const targetLng = activePickup.hospital_longitude;
      const startLat = collectorPos?.lat || (targetLat + 0.015);
      const startLng = collectorPos?.lng || (targetLng + 0.015);

      let step = 0;
      const totalSteps = 20;

      simIntervalRef.current = setInterval(() => {
        step += 1;
        setSimStep(step);

        const currentRatio = Math.min(step / totalSteps, 1.0);
        const curLat = startLat + (targetLat - startLat) * currentRatio;
        const curLng = startLng + (targetLng - startLng) * currentRatio;

        sendLocationUpdate(parseFloat(curLat.toFixed(6)), parseFloat(curLng.toFixed(6)), activePickup.id);

        if (step >= totalSteps) {
          clearInterval(simIntervalRef.current);
          setIsSimulating(false);
          toast.success('Vehicle reached hospital premises! Ready to complete pickup.');
        }
      }, 1500);
    }
  };

  const handleCompletePickup = async () => {
    if (!activePickup) return;
    setCompleting(true);

    try {
      await apiClient.put(`/collector/pickups/${activePickup.id}/complete`);
      stopAllTracking();
      toast.success(`Pickup #PU-${String(activePickup.id).padStart(4, '0')} Completed & Safely Collected!`);
      navigate('/collector/history');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to complete pickup.';
      toast.error(msg);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold uppercase">Connecting Satellite GPS Dispatch...</p>
      </div>
    );
  }

  if (!activePickup) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-soft">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <Truck className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800">No Active Pickup in Progress</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You do not currently have an accepted active pickup. Please accept an assigned dispatch from your queue.
          </p>
        </div>
        <Link
          to="/collector/assigned"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs"
        >
          <span>View Assigned Pickups</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Live GPS Transmission Active</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
              PU-#{String(activePickup.id).padStart(4, '0')}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Active Medical Waste Dispatch</h1>
          <p className="text-xs text-slate-500">
            Broadcasting live coordinates to Hospital & Admin dashboards in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PriorityBadge
            delayRisk={activePickup.delay_risk || activePickup.priority}
            delayProbability={activePickup.delay_probability || activePickup.priority_confidence}
            size="lg"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Map */}
        <div className="lg:col-span-2 space-y-4">
          <LiveTrackingMap
            hospitalLat={activePickup.hospital_latitude}
            hospitalLng={activePickup.hospital_longitude}
            hospitalName={activePickup.hospital?.name || "Target Hospital"}
            hospitalAddress={activePickup.pickup_address}
            collectorLat={collectorPos?.lat || activePickup.hospital_latitude + 0.008}
            collectorLng={collectorPos?.lng || activePickup.hospital_longitude + 0.008}
            collectorName={user?.name || "Your Vehicle"}
            collectorPhone={user?.phone || ""}
            height="460px"
          />

          {/* Simulation / Desktop Test Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800">1-Click Live GPS Route Simulator</p>
                <p className="text-[11px] text-slate-600">Simulate vehicle driving towards hospital in real time for testing</p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSimulation}
              className={`px-4 py-2 rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isSimulating 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'Pause GPS Simulation' : 'Start Auto Drive Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Right Col: Consignment Details & Complete Button */}
        <div className="space-y-4">
          {/* Target Facility Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Destination Facility</p>
                <h3 className="text-base font-black text-slate-900">{activePickup.hospital?.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activePickup.pickup_address}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Facility Phone:</span>
                <a href={`tel:${activePickup.hospital?.phone}`} className="font-bold text-teal-700 hover:underline">
                  {activePickup.hospital?.phone || "N/A"}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Coordinates:</span>
                <span className="font-mono text-[11px] text-slate-600">
                  {activePickup.hospital_latitude.toFixed(4)}, {activePickup.hospital_longitude.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Waste Consignment Info */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Consignment Verification</h4>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Category:</span>
                <WasteCategoryBadge category={activePickup.waste_record?.category} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Description:</span>
                <span className="font-bold text-slate-800">{activePickup.waste_record?.waste_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Weight:</span>
                <span className="font-black text-slate-900 text-sm">{activePickup.waste_record?.quantity} kg</span>
              </div>
              {activePickup.waste_record?.notes && (
                <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-600">
                  <strong>Notes:</strong> {activePickup.waste_record.notes}
                </div>
              )}
            </div>

            {/* Complete Pickup Action Button */}
            <button
              type="button"
              onClick={handleCompletePickup}
              disabled={completing}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {completing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Handover & Complete Pickup</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Clicking complete stops GPS broadcast and archives the manifest to Collection History.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectorActivePickupPage;
