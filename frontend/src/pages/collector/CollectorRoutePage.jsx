import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  Navigation, 
  MapPin, 
  Truck, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Scale, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import DelayRiskBadge from '../../components/common/DelayRiskBadge';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';

// Auto zoom & fit map bounds
function RouteBoundsFitter({ waypoints }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [waypoints, map]);
  return null;
}

// Custom Leaflet stop icon
const createStopMarkerIcon = (num, isDepot = false, isCollected = false) => {
  const bg = isCollected ? '#16a34a' : (isDepot ? '#0f766e' : '#2563eb');
  const label = isCollected ? '✓ DONE' : (isDepot ? 'DEPOT' : `STOP ${num}`);
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
    className: 'custom-collector-stop-marker',
    iconSize: [66, 24],
    iconAnchor: [33, 12],
    popupAnchor: [0, -14],
  });
};

export const CollectorRoutePage = () => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStopId, setUpdatingStopId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveRoute();
  }, []);

  const fetchActiveRoute = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/routes/active');
      setRoute(res.data);
    } catch (e) {
      toast.error('Failed to load active multi-stop route.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkStopCollected = async (stopId) => {
    if (!route) return;
    setUpdatingStopId(stopId);
    try {
      await apiClient.put(`/routes/${route.id}/stops/${stopId}/status`, {
        status: 'Collected'
      });
      toast.success('Hospital stop confirmed and marked Collected!');
      fetchActiveRoute();
    } catch (e) {
      toast.error('Failed to update stop status.');
    } finally {
      setUpdatingStopId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold uppercase">Connecting to Fleet Route Control...</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-soft text-center space-y-4 max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Truck className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800">No Active Dispatched Route</h2>
          <p className="text-xs text-slate-500">
            You do not currently have a multi-stop route assigned by the Central Admin Directorate. Check your assigned pickups queue for individual dispatches.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/collector/assigned')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          View Assigned Pickups
        </button>
      </div>
    );
  }

  const allCompleted = route.stops.every(s => s.status === 'Collected');

  return (
    <div className="space-y-6">
      {/* Route Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Salem Bio-Fleet Navigation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Optimized Multi-Stop Route: {route.route_code}
          </h1>
          <p className="text-xs text-slate-500">
            Calculated by Google OR-Tools to minimize travel distance, service time windows, and biohazard transit risks.
          </p>
        </div>

        {/* Status & Vehicle Info */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
            allCompleted 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            {allCompleted ? '✓ Route Completed' : '● Mission In-Progress'}
          </span>
          <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            Vehicle: {route.vehicle_number} ({route.vehicle_type})
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total Route Distance</p>
          <p className="text-xl font-black text-slate-900 mt-1">{route.total_distance_km} km</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Salem Urban Sector</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
          <p className="text-[10px] font-bold uppercase text-slate-400">Est. Total Duration</p>
          <p className="text-xl font-black text-slate-900 mt-1">{route.total_duration_minutes} min</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Includes loading at stops</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total Waste Payload</p>
          <p className="text-xl font-black text-teal-700 mt-1">{route.total_waste_kg} kg</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Capacity: {route.vehicle_capacity_kg} kg</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
          <p className="text-[10px] font-bold uppercase text-slate-400">Planned Stops</p>
          <p className="text-xl font-black text-blue-700 mt-1">{route.stops.length} Hospitals</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {route.stops.filter(s => s.status === 'Collected').length} Collected
          </p>
        </div>
      </div>

      {/* Map & Stop Sequence Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Multi-Stop Map (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-blue-600" />
                Live Turn-by-Turn Route Visualizer
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Salem Medical Corridor</span>
            </div>

            <div className="h-[420px] rounded-2xl overflow-hidden border border-slate-200">
              <MapContainer
                center={[route.collector_start_lat || 11.6643, route.collector_start_lng || 78.1460]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Auto-fit map to route waypoints */}
                {route.route_geometry?.length > 0 && (
                  <RouteBoundsFitter waypoints={route.route_geometry} />
                )}

                {/* Collector Depot Marker */}
                <Marker
                  position={[route.collector_start_lat, route.collector_start_lng]}
                  icon={createStopMarkerIcon(0, true, false)}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-teal-800">Your Base Depot</p>
                      <p className="text-slate-600">{route.collector_address}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Hospital Stop Markers */}
                {route.stops.map((stop) => (
                  <Marker
                    key={stop.stop_order}
                    position={[stop.latitude, stop.longitude]}
                    icon={createStopMarkerIcon(stop.stop_order, false, stop.status === 'Collected')}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 p-1">
                        <p className="font-bold text-blue-800">Stop #{stop.stop_order}: {stop.hospital_name}</p>
                        <p className="text-slate-600">{stop.hospital_address}</p>
                        <p className="text-slate-700 font-bold">Waste: {stop.waste_quantity_kg} kg ({stop.waste_category})</p>
                        <p className="text-[10px] text-slate-500">Window: {stop.time_window_start} - {stop.time_window_end}</p>
                        <p className="text-[10px] font-bold text-emerald-700">Status: {stop.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Polyline Route */}
                {route.route_geometry?.length > 1 && (
                  <Polyline
                    positions={route.route_geometry}
                    color="#2563eb"
                    weight={5}
                    opacity={0.85}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Ordered Stops Timeline (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Ordered Hospital Visits Sequence
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">
                Follow Order 1 ➔ {route.stops.length}
              </span>
            </div>

            <div className="space-y-3">
              {route.stops.map((stop) => {
                const isCollected = stop.status === 'Collected';
                return (
                  <div
                    key={stop.stop_order}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isCollected
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                          isCollected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {isCollected ? '✓' : stop.stop_order}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-extrabold text-slate-900">{stop.hospital_name}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {stop.hospital_address}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-xs text-blue-700 block">
                          +{stop.distance_from_prev_km} km
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ETA: +{stop.estimated_arrival_minutes}m
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-2">
                        <WasteCategoryBadge category={stop.waste_category} size="sm" />
                        <span className="font-bold text-slate-800">{stop.waste_quantity_kg} kg</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {stop.time_window_start || '09:00'} - {stop.time_window_end || '13:00'}
                        </span>
                      </div>

                      {stop.hospital_phone && (
                        <a
                          href={`tel:${stop.hospital_phone}`}
                          className="text-slate-600 hover:text-blue-600 font-semibold flex items-center gap-1 text-[10px]"
                        >
                          <Phone className="w-3 h-3" />
                          {stop.hospital_phone}
                        </a>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="pt-1 flex items-center justify-end gap-2">
                      {isCollected ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-white px-3 py-1 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Waste Collected & Stowed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkStopCollected(stop.id)}
                          disabled={updatingStopId === stop.id}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {updatingStopId === stop.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Confirm Handover & Mark Collected
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectorRoutePage;
