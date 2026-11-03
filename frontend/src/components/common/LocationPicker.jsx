import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertCircle, Building } from 'lucide-react';

const SALEM_LOCALITY_PRESETS = [
  { name: 'Meyyanur (Central)', address: 'Meyyanur Main Road, Salem, Tamil Nadu 636004', lat: 11.6715, lng: 78.1332 },
  { name: 'Hasthampatti', address: 'Ramakrishna Road, Hasthampatti, Salem, Tamil Nadu 636007', lat: 11.6752, lng: 78.1580 },
  { name: 'Mamangam / Omalur Rd', address: 'Omalur Main Road, Mamangam, Salem, Tamil Nadu 636302', lat: 11.6965, lng: 78.1215 },
  { name: 'Shevapet (Leigh Bazaar)', address: 'Leigh Bazaar, Shevapet, Salem, Tamil Nadu 636002', lat: 11.6495, lng: 78.1380 },
  { name: 'Ammapet', address: 'Main Road, Ammapet, Salem, Tamil Nadu 636003', lat: 11.6540, lng: 78.1810 },
  { name: 'Suramangalam (Junction)', address: 'Junction Road, Suramangalam, Salem, Tamil Nadu 636005', lat: 11.6850, lng: 78.1150 }
];

export const LocationPicker = ({ latitude, longitude, address, onChange, required = true }) => {
  const [detecting, setDetecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMsg({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      return;
    }

    setDetecting(true);
    setStatusMsg({ type: 'info', text: 'Detecting GPS coordinates in Salem...' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lon = parseFloat(position.coords.longitude.toFixed(6));
        onChange({
          latitude: lat,
          longitude: lon,
          address: address || `Salem GPS Location (${lat}, ${lon})`
        });
        setDetecting(false);
        setStatusMsg({ type: 'success', text: `GPS Location locked: ${lat}, ${lon} (Salem Sector)` });
      },
      (error) => {
        setDetecting(false);
        let errorText = 'Unable to retrieve location via browser.';
        if (error.code === error.PERMISSION_DENIED) {
          errorText = 'Location permission denied. Please enter coordinates manually or pick a Salem locality below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorText = 'Location unavailable. Please enter coordinates manually.';
        } else if (error.code === error.TIMEOUT) {
          errorText = 'Location request timed out. Please enter coordinates manually.';
        }
        setStatusMsg({ type: 'error', text: errorText });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectPreset = (preset) => {
    onChange({
      latitude: preset.lat,
      longitude: preset.lng,
      address: preset.address
    });
    setStatusMsg({ type: 'success', text: `Selected Salem Hub: ${preset.name} (${preset.lat}, ${preset.lng})` });
  };

  return (
    <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-600" />
            Salem, Tamil Nadu Geolocation Coordinates {required && <span className="text-rose-500">*</span>}
          </label>
          <p className="text-[11px] text-slate-500">All registered facilities and fleet depots operate within Salem jurisdiction.</p>
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={detecting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Navigation className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
          {detecting ? 'Detecting...' : 'Use Current GPS'}
        </button>
      </div>

      {statusMsg && (
        <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          statusMsg.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
          'bg-teal-50 text-teal-800 border border-teal-200'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Quick Salem Locality Selector Buttons */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
          Quick Salem Locality Presets:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SALEM_LOCALITY_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleSelectPreset(p)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 font-medium transition-colors"
            >
              📍 {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Latitude <span className="text-slate-400 font-normal">(Salem: ~11.60 to 11.72)</span>
          </label>
          <input
            type="number"
            step="0.000001"
            required={required}
            value={latitude !== undefined ? latitude : ''}
            onChange={(e) => onChange({ latitude: parseFloat(e.target.value) || 0, longitude, address })}
            placeholder="e.g. 11.671500"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Longitude <span className="text-slate-400 font-normal">(Salem: ~78.07 to 78.22)</span>
          </label>
          <input
            type="number"
            step="0.000001"
            required={required}
            value={longitude !== undefined ? longitude : ''}
            onChange={(e) => onChange({ latitude, longitude: parseFloat(e.target.value) || 0, address })}
            placeholder="e.g. 78.133200"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
