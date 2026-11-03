import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client';
import { 
  Navigation, 
  Truck, 
  Building2, 
  Clock, 
  Scale, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import PriorityBadge from '../../components/common/PriorityBadge';
import DelayRiskBadge from '../../components/common/DelayRiskBadge';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Map Bounds Auto-fitter
function MapRouteUpdater({ waypoints }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [waypoints, map]);
  return null;
}

// Custom Numbered Leaflet Marker
const createStopIcon = (num, isDepot = false) => {
  const bg = isDepot ? '#0f766e' : '#2563eb';
  const label = isDepot ? 'DEPOT' : `#${num}`;
  const iconHtml = `
    <div style="
      background-color: ${bg};
      color: white;
      border: 2px solid white;
      border-radius: 20px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      white-space: nowrap;
    ">
      ${isDepot ? '🚛 ' : '🏥 '}${label}
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-stop-marker',
    iconSize: [60, 24],
    iconAnchor: [30, 12],
    popupAnchor: [0, -14],
  });
};

export const AdminRouteOptimizationPage = () => {
  const [pendingPickups, setPendingPickups] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [selectedPickupIds, setSelectedPickupIds] = useState([]);
  const [selectedCollectorId, setSelectedCollectorId] = useState(null);
  
  // Constraints
  const [considerCapacity, setConsiderCapacity] = useState(true);
  const [considerTimeWindows, setConsiderTimeWindows] = useState(true);
  const [returnToDepot, setReturnToDepot] = useState(true);

  // States
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [suggestedRoute, setSuggestedRoute] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [pickupsRes, usersRes] = await Promise.all([
        apiClient.get('/pickups?status=Pending'),
        apiClient.get('/admin/users')
      ]);

      const pickups = pickupsRes.data || [];
      const cols = usersRes.data.collectors || [];

      setPendingPickups(pickups);
      setCollectors(cols);

      // Pre-select first 3 pickups and first collector for quick demo
      if (pickups.length > 0) {
        setSelectedPickupIds(pickups.slice(0, Math.min(3, pickups.length)).map(p => p.id));
      }
      if (cols.length > 0) {
        setSelectedCollectorId(cols[0].id);
      }
    } catch (e) {
      toast.error('Failed to load pending pickups or collector fleet.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePickup = (id) => {
    setSelectedPickupIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPickupIds.length === pendingPickups.length) {
      setSelectedPickupIds([]);
    } else {
      setSelectedPickupIds(pendingPickups.map(p => p.id));
    }
  };

  const selectedCollector = collectors.find(c => c.id === selectedCollectorId);

  const totalSelectedWaste = pendingPickups
    .filter(p => selectedPickupIds.includes(p.id))
    .reduce((sum, p) => sum + (p.waste_record?.quantity || 0), 0);

  const vehicleCapacity = selectedCollector?.vehicle_capacity_kg || 250.0;
  const isCapacityExceeded = totalSelectedWaste > vehicleCapacity;

  const handleRunOptimization = async () => {
    if (!selectedCollectorId) {
      toast.error('Please select an available collector vehicle.');
      return;
    }
    if (selectedPickupIds.length === 0) {
      toast.error('Please select at least one pickup request.');
      return;
    }

    setOptimizing(true);
    try {
      const payload = {
        collector_id: selectedCollectorId,
        pickup_ids: selectedPickupIds,
        consider_capacity: considerCapacity,
        consider_time_windows: considerTimeWindows,
        return_to_depot: returnToDepot
      };

      const res = await apiClient.post('/routes/optimize', payload);
      setSuggestedRoute(res.data);

      if (res.data.feasibility_status === 'Feasible') {
        toast.success(`Optimal ${res.data.stops.length}-stop route solved with Google OR-Tools!`);
      } else if (res.data.feasibility_status === 'Warning') {
        toast((t) => (
          <span className="text-amber-800 text-xs font-semibold">
            Route solved with advisory warnings: {res.data.feasibility_notes}
          </span>
        ), { icon: '⚠️' });
      } else {
        toast.error(res.data.feasibility_notes || 'No feasible route could be solved.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Route optimization failed.';
      toast.error(msg);
    } finally {
      setOptimizing(false);
    }
  };

  const handleConfirmRoute = async () => {
    if (!suggestedRoute || suggestedRoute.stops.length === 0) {
      toast.error('No valid route to confirm.');
      return;
    }

    setConfirming(true);
    try {
      const payload = {
        collector_id: selectedCollectorId,
        pickup_ids: selectedPickupIds,
        route_code: suggestedRoute.route_code
      };

      const res = await apiClient.post('/routes/confirm', payload);
      toast.success(`Route #${res.data.route_code} Confirmed & Dispatched to ${selectedCollector?.name}!`);
      setSuggestedRoute(null);
      // Refresh pending queue
      fetchInitialData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to confirm route dispatch.';
      toast.error(msg);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-xs font-semibold uppercase">Loading Salem Logistics Network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">AI Optimization Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Multi-Stop Route Planner (Google OR-Tools)</h1>
          <p className="text-xs text-slate-500">
            Capacitated Vehicle Routing Problem with Time Windows (CVRPTW) optimized for Salem, Tamil Nadu healthcare facilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-teal-50 text-teal-800 px-3 py-1.5 rounded-full border border-teal-200">
            Salem Central Division
          </span>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pickups & Collector Selection (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Collector Fleet Vehicle Selection */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                1. Select Certified Bio-Carrier Vehicle
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">{collectors.length} in Fleet</span>
            </div>

            <div className="space-y-2">
              {collectors.map(c => {
                const isSelected = selectedCollectorId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCollectorId(c.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
                        : 'bg-slate-50 hover:bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.address}</p>
                      <div className="flex items-center gap-2 pt-1 text-[10px]">
                        <span className="font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                          {c.vehicle_number || `TN-27-AX-${1000 + c.id}`}
                        </span>
                        <span className="text-slate-500">{c.vehicle_type || 'Tata Ace Bio-Carrier'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-blue-700 block">
                        {c.vehicle_capacity_kg || 250} kg
                      </span>
                      <span className="text-[10px] text-slate-400">Max Capacity</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Select Hospital Pickup Requests */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                2. Pending Hospital Pickups ({selectedPickupIds.length}/{pendingPickups.length})
              </h3>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
              >
                {selectedPickupIds.length === pendingPickups.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {pendingPickups.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No pending pickup requests waiting for route assignment.
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {pendingPickups.map(p => {
                  const isChecked = selectedPickupIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleTogglePickup(p.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-teal-50/60 border-teal-400 ring-2 ring-teal-400/20'
                          : 'bg-slate-50 hover:bg-white border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by wrapper onClick
                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">
                            {p.hospital?.name || `Hospital #${p.hospital_id}`}
                          </p>
                          <DelayRiskBadge delayRisk={p.delay_risk || p.priority} size="sm" />
                        </div>
                        <p className="text-[11px] text-slate-500">{p.pickup_address}</p>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <div className="flex items-center gap-1.5">
                            <WasteCategoryBadge category={p.waste_record?.category || 'Yellow'} size="sm" />
                            <span className="font-bold text-slate-700">{p.waste_record?.quantity || 0} kg</span>
                          </div>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {p.preferred_time_window || '09:00 - 13:00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Capacity Meter Bar */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Planned Waste Load:</span>
                <span className={`font-bold ${isCapacityExceeded ? 'text-rose-600' : 'text-slate-800'}`}>
                  {totalSelectedWaste.toFixed(1)} / {vehicleCapacity} kg ({((totalSelectedWaste / vehicleCapacity) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCapacityExceeded ? 'bg-rose-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min(100, (totalSelectedWaste / vehicleCapacity) * 100)}%` }}
                />
              </div>
              {isCapacityExceeded && (
                <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Exceeds vehicle payload limit!
                </p>
              )}
            </div>
          </div>

          {/* 3. Planning Constraints & Solver Trigger */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              3. OR-Tools Optimization Constraints
            </h3>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={considerCapacity}
                  onChange={(e) => setConsiderCapacity(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-700 font-semibold">Strict Vehicle Payload Constraint</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={considerTimeWindows}
                  onChange={(e) => setConsiderTimeWindows(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-700 font-semibold">Hospital Pickup Time Windows</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnToDepot}
                  onChange={(e) => setReturnToDepot(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-700 font-semibold">Circular Tour (Return to Salem Central Depot)</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleRunOptimization}
              disabled={optimizing || selectedPickupIds.length === 0}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {optimizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Google OR-Tools Solver...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Calculate Optimized Multi-Stop Route
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Suggested Route Results & Interactive Map (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {suggestedRoute ? (
            <div className="space-y-5">
              {/* Feasibility Banner */}
              <div className={`p-4 rounded-3xl border flex items-start gap-3 ${
                suggestedRoute.feasibility_status === 'Feasible'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : suggestedRoute.feasibility_status === 'Warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {suggestedRoute.feasibility_status === 'Feasible' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : suggestedRoute.feasibility_status === 'Warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold uppercase tracking-wider">
                    {suggestedRoute.feasibility_status}: {suggestedRoute.route_code}
                  </p>
                  <p className="font-medium opacity-90">{suggestedRoute.feasibility_notes}</p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Distance</p>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{suggestedRoute.total_distance_km} km</p>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Estimated Duration</p>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{suggestedRoute.total_duration_minutes} min</p>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Planned Waste</p>
                  <p className="text-lg font-black text-teal-700 mt-0.5">{suggestedRoute.total_waste_kg} kg</p>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Payload Utilized</p>
                  <p className="text-lg font-black text-blue-700 mt-0.5">{suggestedRoute.capacity_utilization_pct}%</p>
                </div>
              </div>

              {/* Interactive Multi-Stop Map */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    Multi-Stop Geometry Visualizer • Salem Sector
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {suggestedRoute.stops.length} Hospital Stops + Central Depot
                  </span>
                </div>

                <div className="h-[340px] rounded-2xl overflow-hidden border border-slate-200">
                  <MapContainer
                    center={[suggestedRoute.collector_start_lat || 11.6643, suggestedRoute.collector_start_lng || 78.1460]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    {/* Auto-fit map to route waypoints */}
                    {suggestedRoute.route_geometry?.length > 0 && (
                      <MapRouteUpdater waypoints={suggestedRoute.route_geometry} />
                    )}

                    {/* Collector Depot Marker */}
                    <Marker
                      position={[suggestedRoute.collector_start_lat, suggestedRoute.collector_start_lng]}
                      icon={createStopIcon(0, true)}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-teal-800">Collector Dispatch Depot</p>
                          <p className="text-slate-600">{suggestedRoute.collector_name}</p>
                          <p className="text-[10px] text-slate-400">{suggestedRoute.collector_address}</p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Hospital Stop Markers */}
                    {suggestedRoute.stops.map((stop) => (
                      <Marker
                        key={stop.stop_order}
                        position={[stop.latitude, stop.longitude]}
                        icon={createStopIcon(stop.stop_order, false)}
                      >
                        <Popup>
                          <div className="text-xs space-y-1 p-1">
                            <p className="font-extrabold text-blue-800">
                              Stop #{stop.stop_order}: {stop.hospital_name}
                            </p>
                            <p className="text-slate-600">{stop.hospital_address}</p>
                            <p className="text-[11px] font-semibold text-slate-700">
                              Waste: {stop.waste_quantity_kg} kg ({stop.waste_category})
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Window: {stop.time_window_start} - {stop.time_window_end}
                            </p>
                            <p className="text-[10px] text-teal-700 font-bold">
                              Leg: +{stop.distance_from_prev_km} km • ETA: +{stop.estimated_arrival_minutes}m
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Polyline Route Path */}
                    {suggestedRoute.route_geometry?.length > 1 && (
                      <Polyline
                        positions={suggestedRoute.route_geometry}
                        color="#0d9488"
                        weight={5}
                        opacity={0.85}
                        dashArray="6, 6"
                      />
                    )}
                  </MapContainer>
                </div>
              </div>

              {/* Ordered Stops List */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Google OR-Tools Sequence Order</span>
                  <span className="text-[11px] text-slate-400 font-semibold">{suggestedRoute.stops.length} Visits</span>
                </h3>

                <div className="space-y-2.5">
                  {suggestedRoute.stops.map((stop) => (
                    <div
                      key={stop.stop_order}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0">
                          {stop.stop_order}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{stop.hospital_name}</p>
                          <p className="text-[11px] text-slate-500">{stop.hospital_address}</p>
                          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-500 font-medium">
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-700">
                              {stop.waste_quantity_kg} kg {stop.waste_category}
                            </span>
                            <span>•</span>
                            <span>Window: {stop.time_window_start || '09:00'} - {stop.time_window_end || '13:00'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-teal-700 text-xs block">
                          +{stop.distance_from_prev_km} km
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ~{stop.estimated_arrival_minutes}m from start
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Confirm Dispatch Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmRoute}
                    disabled={confirming || suggestedRoute.feasibility_status === 'Infeasible'}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Confirming Dispatch & Assigning Pickups...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm & Dispatch Multi-Stop Route to {suggestedRoute.collector_name}
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Admin maintains final authorization. Confirming binds all selected pickups to this vehicle in suggested order.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-soft text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <Navigation className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">Ready to Compute Optimal Route</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Select a certified vehicle from Salem fleet and check pending hospital pickup requests on the left, then click <b>Calculate Optimized Multi-Stop Route</b>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRouteOptimizationPage;
