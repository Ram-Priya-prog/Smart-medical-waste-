import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  Trash2, 
  PlusCircle, 
  CalendarPlus, 
  Search, 
  Filter, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

export const WasteManagementPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: 'Yellow',
    waste_type: '',
    quantity: '',
    unit: 'kg',
    notes: ''
  });

  useEffect(() => {
    fetchWasteRecords();
  }, [categoryFilter]);

  const fetchWasteRecords = async () => {
    setLoading(true);
    try {
      const url = categoryFilter ? `/waste?category=${categoryFilter}` : '/waste';
      const res = await apiClient.get(url);
      setRecords(res.data);
    } catch (err) {
      toast.error('Failed to load waste records.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordWaste = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/waste', {
        ...formData,
        quantity: parseFloat(formData.quantity)
      });
      toast.success('Medical waste batch recorded successfully!');
      setIsModalOpen(false);
      setFormData({
        category: 'Yellow',
        waste_type: '',
        quantity: '',
        unit: 'kg',
        notes: ''
      });
      fetchWasteRecords();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to record waste.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter(r => 
    !search || r.waste_type.toLowerCase().includes(search.toLowerCase()) ||
    (r.notes && r.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Internal Storage Logs</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Hospital Waste Recording</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log generated biomedical waste batches by category with mass metrics.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record New Waste Batch</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by waste item or notes..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="Yellow">Yellow (Infectious/Anatomical)</option>
            <option value="Red">Red (Contaminated Plastics)</option>
            <option value="White">White (Sharps & Blades)</option>
            <option value="Blue">Blue (Glassware & Implants)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Record ID</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Waste Item / Description</th>
                <th className="px-5 py-3.5">Quantity</th>
                <th className="px-5 py-3.5">Log Date & Time</th>
                <th className="px-5 py-3.5">Pickup Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                    <p className="text-xs">Loading records...</p>
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">#WR-{String(r.id).padStart(4, '0')}</td>
                    <td className="px-5 py-3.5">
                      <WasteCategoryBadge category={r.category} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-800">{r.waste_type}</p>
                      {r.notes && <p className="text-[11px] text-slate-500 truncate max-w-xs">{r.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 font-extrabold text-slate-800">{r.quantity} {r.unit}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(r.created_at).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.is_scheduled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold text-[11px] border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pickup Scheduled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-semibold text-[11px] border border-amber-200">
                          In Storage
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!r.is_scheduled && (
                        <button
                          onClick={() => navigate(`/hospital/schedule?waste_id=${r.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold border border-teal-200 text-xs transition-colors cursor-pointer"
                        >
                          Schedule Pickup
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">
                    No medical waste records found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Waste Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record New Biomedical Waste Batch"
        subtitle="Log newly generated waste according to color categorization guidelines"
      >
        <form onSubmit={handleRecordWaste} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Biomedical Waste Category *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'Yellow', label: 'Yellow', desc: 'Anatomical / Soiled / Expired', border: 'hover:border-yellow-400' },
                { id: 'Red', label: 'Red', desc: 'Contaminated Plastics / Gloves', border: 'hover:border-red-400' },
                { id: 'White', label: 'White', desc: 'Needles / Scalpels / Sharps', border: 'hover:border-slate-400' },
                { id: 'Blue', label: 'Blue', desc: 'Glassware / Metallic Implants', border: 'hover:border-blue-400' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: c.id })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.category === c.id 
                      ? 'bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/20 shadow-xs' 
                      : `bg-white border-slate-200 ${c.border}`
                  }`}
                >
                  <WasteCategoryBadge category={c.id} size="sm" />
                  <p className="text-[11px] text-slate-500 mt-1">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Waste Item / Description *
            </label>
            <input
              type="text"
              required
              value={formData.waste_type}
              onChange={(e) => setFormData({ ...formData, waste_type: e.target.value })}
              placeholder="e.g. Contaminated ICU Gloves, Dialysis Tubing"
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="1000"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g. 25.5"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                disabled
                value="kg (Kilograms)"
                className="w-full px-3 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Storage Notes & Department Info
            </label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Generated in Emergency Trauma Ward; stored in refrigeration unit #2."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              <span>Save Record</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WasteManagementPage;
