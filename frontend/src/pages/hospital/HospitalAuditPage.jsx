import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { 
  FileCheck, 
  Download, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  Filter, 
  Search, 
  Loader2, 
  Edit3, 
  X,
  PieChart as PieIcon,
  BarChart2,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import WasteCategoryBadge from '../../components/common/WasteCategoryBadge';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const HospitalAuditPage = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [recordToCorrect, setRecordToCorrect] = useState(null);
  const [newCategory, setNewCategory] = useState('White');
  const [correctionReason, setCorrectionReason] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Export Loading States
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  useEffect(() => {
    fetchAuditData();
  }, [selectedYear, selectedMonth]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/audit/monthly?year=${selectedYear}&month=${selectedMonth}`);
      setAuditData(res.data);
    } catch (e) {
      toast.error('Failed to load monthly waste audit records.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCorrection = (record) => {
    setRecordToCorrect(record);
    // Suggest recommended category if available
    const warn = auditData?.warnings?.find(w => w.record_id === record.id);
    setNewCategory(warn?.recommended_category || (record.category === 'White' ? 'Yellow' : 'White'));
    setCorrectionReason('');
    setCorrectionModalOpen(true);
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!recordToCorrect) return;
    if (!correctionReason.trim()) {
      toast.error('Please enter a clinical/operational reason for this segregation correction.');
      return;
    }

    setSavingCorrection(true);
    try {
      await apiClient.post(`/audit/correct-waste/${recordToCorrect.id}`, {
        new_category: newCategory,
        correction_reason: correctionReason.trim()
      });
      toast.success(`Waste Batch #${recordToCorrect.id} segregation updated to ${newCategory}!`);
      setCorrectionModalOpen(false);
      fetchAuditData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update segregation record.');
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await apiClient.get(
        `/audit/report/pdf?year=${selectedYear}&month=${selectedMonth}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BMW_Audit_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Statutory PDF Compliance Audit Report downloaded.');
    } catch (e) {
      toast.error('Failed to generate PDF audit report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const res = await apiClient.get(
        `/audit/report/csv?year=${selectedYear}&month=${selectedMonth}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BMW_Audit_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tabular CSV Audit Manifest downloaded.');
    } catch (e) {
      toast.error('Failed to generate CSV audit report.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  // Filtered Records
  const records = auditData?.records || [];
  const filteredRecords = records.filter(r => {
    const matchCat = filterCategory === 'ALL' || r.category === filterCategory || r.audit_classification === filterCategory;
    const matchSearch = !searchQuery || 
      r.waste_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.id).includes(searchQuery);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner & Period Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Internal Facility Quality & Compliance</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Monthly Medical-Waste Audit Dashboard</h1>
          <p className="text-xs text-slate-500">
            Monitor biomedical waste generation streams, validate sorting consistency, and export statutory compliance reports.
          </p>
        </div>

        {/* Month & Year Selectors and Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer border-l border-slate-200 pl-2"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {/* Export Dropdown / Actions */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export PDF Report
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={downloadingCsv || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloadingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-xs font-semibold uppercase">Analyzing Monthly Waste Manifests...</p>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Waste</p>
              <p className="text-xl font-black text-slate-900 mt-1">{auditData?.total_waste_kg || 0} kg</p>
              <p className="text-[10px] text-teal-600 font-semibold mt-0.5">{auditData?.total_records || 0} batches</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Sharps (White)</p>
              <p className="text-xl font-black text-slate-900 mt-1">{auditData?.total_sharps_kg || 0} kg</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Puncture containers</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600">Anatomical</p>
              <p className="text-xl font-black text-slate-900 mt-1">{auditData?.total_anatomical_kg || 0} kg</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Incinerable tissue</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Cytotoxic</p>
              <p className="text-xl font-black text-slate-900 mt-1">{auditData?.total_cytotoxic_kg || 0} kg</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Oncology medication</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">General Waste</p>
              <p className="text-xl font-black text-slate-900 mt-1">{auditData?.total_general_kg || 0} kg</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Municipal stream</p>
            </div>

            <div className={`p-4 rounded-3xl border shadow-soft ${
              (auditData?.inconsistencies_count || 0) > 0 
                ? 'bg-rose-50/70 border-rose-200' 
                : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sorting Warnings</p>
              <p className={`text-xl font-black mt-1 ${
                (auditData?.inconsistencies_count || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}>
                {auditData?.inconsistencies_count || 0}
              </p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                {(auditData?.inconsistencies_count || 0) > 0 ? 'Review Recommended' : 'Optimal Segregation'}
              </p>
            </div>
          </div>

          {/* Sorting Validation Warnings Section */}
          {auditData?.warnings && auditData.warnings.length > 0 && (
            <div className="bg-rose-50/80 p-5 rounded-3xl border border-rose-200 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Bio-Medical Waste Segregation Inconsistencies Detected ({auditData.warnings.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold bg-white text-rose-700 px-3 py-1 rounded-full border border-rose-200">
                  Advisory Action Required
                </span>
              </div>
              <p className="text-xs text-rose-900">
                The advisory validation engine detected potential waste stream sorting discrepancies against the 
                Bio-Medical Waste Management Rules, 2016. Please review and correct the containment protocol below:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {auditData.warnings.map(warn => (
                  <div key={warn.record_id} className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">Batch #{warn.record_id}: {warn.waste_type}</span>
                      <span className="font-extrabold text-xs text-slate-700">{warn.quantity} kg</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500">Logged Category:</span>
                      <WasteCategoryBadge category={warn.selected_category} size="sm" />
                      <span className="text-slate-400">➔</span>
                      <span className="text-slate-500">Recommended:</span>
                      <WasteCategoryBadge category={warn.recommended_category} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {warn.warning_reason}
                    </p>
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const record = records.find(r => r.id === warn.record_id);
                          if (record) handleOpenCorrection(record);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Correct Segregation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pie Chart: Category Distribution (5 cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-teal-600" />
                  Waste Stream Distribution
                </h3>
                <span className="text-[11px] text-slate-400 font-semibold">{auditData?.month_name} {auditData?.year}</span>
              </div>

              <div className="h-[250px]">
                {auditData?.category_distribution && auditData.category_distribution.some(c => c.quantity > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={auditData.category_distribution.filter(c => c.quantity > 0)}
                        dataKey="quantity"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {auditData.category_distribution.filter(c => c.quantity > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [`${val} kg`, 'Quantity']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No waste recorded in this period.
                  </div>
                )}
              </div>
            </div>

            {/* Bar Chart: Weekly Monthly Generation Trend (7 cols) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Monthly Generation Trend (kg by Week)
                </h3>
                <span className="text-[11px] text-slate-400 font-semibold">Weekly Profile</span>
              </div>

              <div className="h-[250px]">
                {auditData?.monthly_trend && auditData.monthly_trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={auditData.monthly_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="kg" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sharps" name="Sharps" fill="#f59e0b" stackId="a" />
                      <Bar dataKey="anatomical" name="Anatomical" fill="#eab308" stackId="a" />
                      <Bar dataKey="plastics" name="Plastics" fill="#ef4444" stackId="a" />
                      <Bar dataKey="glassware" name="Glassware" fill="#3b82f6" stackId="a" />
                      <Bar dataKey="cytotoxic" name="Cytotoxic" fill="#8b5cf6" stackId="a" />
                      <Bar dataKey="general" name="General" fill="#64748b" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No weekly generation records.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Waste Records Table & Filters */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Monthly Logged Waste Batches</h3>
                <p className="text-xs text-slate-500">Detailed register of all facility biomedical waste manifests.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search type or #ID..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Yellow">Yellow (Anatomical)</option>
                  <option value="Red">Red (Plastics)</option>
                  <option value="White">White (Sharps)</option>
                  <option value="Blue">Blue (Glass)</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Batch ID</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Waste Type</th>
                    <th className="py-3 px-3">Mass (kg)</th>
                    <th className="py-3 px-3">Logged Date</th>
                    <th className="py-3 px-3">Pickup Status</th>
                    <th className="py-3 px-3">Validation Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No waste batches match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          #{String(r.id).padStart(4, '0')}
                        </td>
                        <td className="py-3 px-3">
                          <WasteCategoryBadge category={r.category} size="sm" />
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{r.waste_type}</p>
                          {r.notes && <p className="text-[10px] text-slate-400 truncate max-w-xs">{r.notes}</p>}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {r.quantity} {r.unit}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.pickup_status === 'Collected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            r.pickup_status === 'Accepted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            r.pickup_status === 'Assigned' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            r.pickup_status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {r.pickup_status || 'Logged'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {r.has_sorting_warning ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10px]">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              Review Needed
                            </span>
                          ) : r.is_corrected ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              Corrected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              Verified OK
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenCorrection(r)}
                            className="text-teal-600 hover:text-teal-800 font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Correct
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Regulatory Disclaimer Banner */}
          <div className="bg-slate-100/90 p-4 rounded-2xl border border-slate-200 flex items-start gap-3 text-slate-600 text-xs">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>Regulatory Disclaimer:</b> {auditData?.regulatory_disclaimer}
            </p>
          </div>
        </>
      )}

      {/* Segregation Correction Modal */}
      {correctionModalOpen && recordToCorrect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-teal-700">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-bold text-sm">Correct Waste Stream Segregation</h3>
              </div>
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">Batch #{recordToCorrect.id}: {recordToCorrect.waste_type}</p>
                <p className="text-slate-500">Current Category: <b>{recordToCorrect.category}</b> • Mass: {recordToCorrect.quantity} kg</p>
                {recordToCorrect.warning_reason && (
                  <p className="text-[11px] text-rose-700 pt-1 font-medium bg-rose-50 p-2 rounded-lg border border-rose-100">
                    ⚠️ {recordToCorrect.warning_reason}
                  </p>
                )}
              </div>

              <form onSubmit={handleSaveCorrection} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Select Proper Biomedical Waste Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800"
                  >
                    <option value="White">White (Puncture-proof translucent sharps containers)</option>
                    <option value="Yellow">Yellow (Anatomical / Cytotoxic / Soiled dressings)</option>
                    <option value="Red">Red (Contaminated autoclavable recyclable plastics)</option>
                    <option value="Blue">Blue (Glassware, ampoules, metallic implants)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Correction Clinical / Operational Justification *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="e.g. Verified packaging meets White puncture-proof container standard; reassigned to prevent needle hazard."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This justification is permanently preserved in the regulatory compliance audit trail.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCorrectionModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCorrection}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingCorrection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Confirm Correction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAuditPage;
