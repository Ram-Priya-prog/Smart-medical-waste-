import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Building2, Truck } from 'lucide-react';

// Custom Map center updater component for Leaflet
function MapUpdater({ hospitalPos, collectorPos }) {
  const map = useMap();
  useEffect(() => {
    if (hospitalPos && collectorPos) {
      const bounds = L.latLngBounds([hospitalPos, collectorPos]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (hospitalPos) {
      map.setView(hospitalPos, 14);
    }
  }, [hospitalPos, collectorPos, map]);
  return null;
}

// Custom Leaflet HTML icons
const createCustomIcon = (type, title) => {
  const isHospital = type === 'hospital';
  const color = isHospital ? '#0d9488' : '#ef4444';
  const bg = isHospital ? '#f0fdfa' : '#fff1f2';
  const iconHtml = `
    <div style="
      background-color: ${bg};
      border: 2px solid ${color};
      color: ${color};
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      position: relative;
    ">
      <span style="font-size: 18px; font-weight: bold;">${isHospital ? '🏥' : '🚛'}</span>
      ${!isHospital ? '<span style="position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; background: #22c55e; border-radius: 50%; border: 2px solid white;"></span>' : ''}
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
};

export const LiveTrackingMap = ({
  hospitalLat,
  hospitalLng,
  hospitalName = "Hospital Facility",
  hospitalAddress = "",
  collectorLat,
  collectorLng,
  collectorName = "Assigned Collector",
  collectorPhone = "",
  status = "Accepted",
  height = "420px"
}) => {
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [useGoogleMaps, setUseGoogleMaps] = useState(Boolean(googleApiKey && googleApiKey !== ''));
  const googleMapRef = useRef(null);
  const gmapInstance = useRef(null);
  const markersRef = useRef({ hospital: null, collector: null, line: null });

  const hospPos = (hospitalLat && hospitalLng && !isNaN(hospitalLat)) ? [parseFloat(hospitalLat), parseFloat(hospitalLng)] : [11.6643, 78.1460];
  const colPos = (collectorLat && collectorLng && !isNaN(collectorLat)) ? [parseFloat(collectorLat), parseFloat(collectorLng)] : null;

  // Google Maps JS API Integration
  useEffect(() => {
    if (!useGoogleMaps || !googleApiKey) return;

    let isMounted = true;
    const loadGoogleMaps = async () => {
      try {
        if (!window.google || !window.google.maps) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) initGoogleMap();
          };
          script.onerror = () => {
            console.warn("Google Maps failed to load, falling back to OpenStreetMap.");
            if (isMounted) setUseGoogleMaps(false);
          };
          document.head.appendChild(script);
        } else {
          initGoogleMap();
        }
      } catch (e) {
        console.warn("Google Maps error, using Leaflet fallback:", e);
        if (isMounted) setUseGoogleMaps(false);
      }
    };

    const initGoogleMap = () => {
      if (!googleMapRef.current || !window.google) return;

      const center = hospPos ? { lat: hospPos[0], lng: hospPos[1] } : { lat: 11.6643, lng: 78.1460 };
      const map = new window.google.maps.Map(googleMapRef.current, {
        zoom: 14,
        center: center,
        styles: [
          { featureType: "poi.business", stylers: [{ visibility: "off" }] },
          { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
        ]
      });
      gmapInstance.current = map;

      // Hospital Marker
      markersRef.current.hospital = new window.google.maps.Marker({
        position: center,
        map: map,
        title: hospitalName,
        label: { text: "🏥", fontSize: "16px" }
      });

      // Collector Marker if present
      if (colPos) {
        const colCenter = { lat: colPos[0], lng: colPos[1] };
        markersRef.current.collector = new window.google.maps.Marker({
          position: colCenter,
          map: map,
          title: collectorName,
          label: { text: "🚛", fontSize: "16px" }
        });

        // Polyline connecting them
        markersRef.current.line = new window.google.maps.Polyline({
          path: [center, colCenter],
          geodesic: true,
          strokeColor: "#0d9488",
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: map
        });

        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(center);
        bounds.extend(colCenter);
        map.fitBounds(bounds, 50);
      }
    };

    loadGoogleMaps();

    return () => {
      isMounted = false;
    };
  }, [useGoogleMaps, googleApiKey]);

  // Update Google Maps positions when props change
  useEffect(() => {
    if (useGoogleMaps && gmapInstance.current && window.google) {
      const hCenter = { lat: hospPos[0], lng: hospPos[1] };
      if (markersRef.current.hospital) {
        markersRef.current.hospital.setPosition(hCenter);
      }
      if (colPos && markersRef.current.collector) {
        const cCenter = { lat: colPos[0], lng: colPos[1] };
        markersRef.current.collector.setPosition(cCenter);
        if (markersRef.current.line) {
          markersRef.current.line.setPath([hCenter, cCenter]);
        }
      }
    }
  }, [hospitalLat, hospitalLng, collectorLat, collectorLng, useGoogleMaps]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-soft bg-slate-50">
      {/* Top Map Header & Realtime Pulse Indicator */}
      <div className="absolute top-3 left-3 right-3 z-1000 flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-slate-200/80 pointer-events-auto flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
          </span>
          <span className="text-xs font-bold text-slate-800">
            {colPos ? 'Live GPS Satellite Tracking Active' : 'Target Hospital Location'}
          </span>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 pointer-events-auto text-[11px] font-semibold text-slate-600">
          {useGoogleMaps ? 'Google Maps Engine' : 'OpenStreetMap Engine'}
        </div>
      </div>

      {/* Map Body */}
      {useGoogleMaps ? (
        <div ref={googleMapRef} style={{ height, width: '100%' }} />
      ) : (
        <MapContainer
          center={hospPos}
          zoom={14}
          style={{ height, width: '100%' }}
          scrollWheelZoom={false}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater hospitalPos={hospPos} collectorPos={colPos} />

          {/* Hospital Marker */}
          <Marker position={hospPos} icon={createCustomIcon('hospital', hospitalName)}>
            <Popup>
              <div className="p-1 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{hospitalName}</span>
                </div>
                {hospitalAddress && <p className="text-[11px] text-slate-600">{hospitalAddress}</p>}
                <p className="text-[10px] text-slate-400">Lat: {hospPos[0].toFixed(5)}, Lon: {hospPos[1].toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>

          {/* Collector Marker */}
          {colPos && (
            <Marker position={colPos} icon={createCustomIcon('collector', collectorName)}>
              <Popup>
                <div className="p-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <Truck className="w-3.5 h-3.5" />
                    <span>{collectorName}</span>
                  </div>
                  {collectorPhone && <p className="text-[11px] text-slate-600">Phone: {collectorPhone}</p>}
                  <p className="text-[11px] font-medium text-emerald-700">● Moving towards facility</p>
                  <p className="text-[10px] text-slate-400">Lat: {colPos[0].toFixed(5)}, Lon: {colPos[1].toFixed(5)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Polyline Route */}
          {colPos && (
            <Polyline
              positions={[hospPos, colPos]}
              color="#0d9488"
              weight={4}
              dashArray="6, 8"
            />
          )}
        </MapContainer>
      )}

      {/* Bottom Coordinates Legend Bar */}
      <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-600 inline-block"></span>
            <span className="font-semibold text-slate-700">Hospital:</span> {hospPos[0].toFixed(4)}, {hospPos[1].toFixed(4)}
          </div>
          {colPos && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block animate-pulse"></span>
              <span className="font-semibold text-slate-700">Collector GPS:</span> {colPos[0].toFixed(4)}, {colPos[1].toFixed(4)}
            </div>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          Real-time WebSocket Push enabled
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingMap;
