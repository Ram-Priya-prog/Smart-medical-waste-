import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { 
  Building2, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Loader2,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminHospitalsPage = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users');
      setHospitals(res.data.hospitals || []);
    } catch (e) {
      toast.error('Failed to load registered hospitals.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = hospitals.filter(h =>
    !search ||
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.email.toLowerCase().includes(search.toLowerCase()) ||
    h.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Healthcare Facilities Directory</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Registered Hospitals & Clinics</h1>
          <p className="text-xs text-slate-500">
            Authorized medical facilities generating and logging biomedical waste batches.
          </p>
        </div>

        <div className="text-xs font-bold bg-teal-50 text-teal-800 px-3.5 py-1.5 rounded-full border border-teal-200">
          {hospitals.length} Certified Facilities
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facility name, address, email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs">Loading healthcare facilities...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-soft hover:shadow-card transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{h.name}</h3>
                    <p className="text-[11px] text-teal-700 font-semibold">Hospital #HOSP-{String(h.id).padStart(3, '0')}</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-600 truncate">{h.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-medium">{h.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-medium truncate">{h.email}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                <span>GPS Coords:</span>
                <span className="font-mono text-slate-600 font-semibold">
                  {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            No healthcare facilities matching search.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHospitalsPage;
