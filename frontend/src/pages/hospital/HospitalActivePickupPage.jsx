import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  Navigation, 
  Phone, 
  Building2, 
  Truck, 
  Radio, 
  Clock, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import PriorityBadge from '../../components/common/PriorityBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import StatusBadge from '../../components/common/StatusBadge';
import LiveTrackingMap from '../../components/maps/LiveTrackingMap';

export const HospitalActivePickupPage = () => {
  const [activePickup, setActivePickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    fetchActivePickup();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchActivePickup = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/pickups/active');
      if (res.data && res.data.length > 0) {
        const pickup = res.data[0];
        setActivePickup(pickup);
        connectWebSocket(pickup.id);
      } else {
        setActivePickup(null);
      }
    } catch (e) {
      console.error('Error fetching active pickup:', e);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (pickupId) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/location/${pickupId}`;

    console.log('[WebSocket] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected for live GPS tracking');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.latitude && data.longitude) {
          setLiveLocation({
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude),
            timestamp: data.timestamp
          });
        }
      } catch (e) {
        console.error('[WebSocket] Parsing error:', e);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log('[WebSocket] Disconnected');
    };

    ws.onerror = (err) => {
      console.warn('[WebSocket] Error, will rely on polling fallback:', err);
      setWsConnected(false);
    };
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-xs font-semibold uppercase">Connecting to Satellite Telemetry...</p>
      </div>
    );
  }

  if (!activePickup) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-soft">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <Navigation className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800">No Active Pickup in Transit</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Live GPS telemetry automatically activates once an assigned collector accepts your pickup request and departs towards your facility.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/hospital/dashboard"
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
          >
            Dashboard
          </Link>
          <Link
            to="/hospital/schedule"
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700"
          >
            Schedule Pickup
          </Link>
        </div>
      </div>
    );
  }

  const collectorCurrentLat = liveLocation?.lat || activePickup.collector?.latitude || activePickup.hospital_latitude + 0.008;
  const collectorCurrentLng = liveLocation?.lng || activePickup.collector?.longitude || activePickup.hospital_longitude + 0.008;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Live Satellite Telemetry</span>
            {wsConnected ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                WebSocket Online
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                Syncing Coordinates
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Live Collector Dispatch Tracking</h1>
          <p className="text-xs text-slate-500">
            Real-time GPS stream of assigned vehicle en route to your healthcare facility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PriorityBadge
            delayRisk={activePickup.delay_risk || activePickup.priority}
            delayProbability={activePickup.delay_probability || activePickup.priority_confidence}
            size="lg"
          />
        </div>
      </div>

      {/* Main Tracking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Map */}
        <div className="lg:col-span-2">
          <LiveTrackingMap
            hospitalLat={activePickup.hospital_latitude}
            hospitalLng={activePickup.hospital_longitude}
            hospitalName={activePickup.hospital?.name || "Your Facility"}
            hospitalAddress={activePickup.pickup_address}
            collectorLat={collectorCurrentLat}
            collectorLng={collectorCurrentLng}
            collectorName={activePickup.collector?.name || "Assigned Driver"}
            collectorPhone={activePickup.collector?.phone || ""}
            height="500px"
          />
        </div>

        {/* Right Col: Logistics & Driver Card */}
        <div className="space-y-5">
          {/* Driver Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Collector</p>
                <h3 className="text-base font-black text-slate-900">{activePickup.collector?.name || "Collector"}</h3>
                <p className="text-xs text-teal-600 font-semibold">{activePickup.collector?.address || "Mobile Fleet Unit"}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Direct Phone:</span>
                <a
                  href={`tel:${activePickup.collector?.phone}`}
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{activePickup.collector?.phone || "N/A"}</span>
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Dispatch Status:</span>
                <StatusBadge status="Accepted" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Accepted At:</span>
                <span className="font-semibold text-slate-800">
                  {activePickup.accepted_at ? new Date(activePickup.accepted_at).toLocaleTimeString() : 'Recently'}
                </span>
              </div>
            </div>
          </div>

          {/* Waste Batch Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Pickup Consignment</h4>
            
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Category:</span>
                <WasteCategoryBadge category={activePickup.waste_record?.category} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Item:</span>
                <span className="font-bold text-slate-800">{activePickup.waste_record?.waste_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mass:</span>
                <span className="font-black text-slate-900 text-sm">{activePickup.waste_record?.quantity} kg</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              <strong>Handover Requirement:</strong> Please ensure authorized staff signs the digital manifest upon collector arrival.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalActivePickupPage;
