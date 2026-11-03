import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { 
  FileCheck, 
  Download, 
  Calendar, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Filter, 
  Search, 
  Loader2, 
  BarChart2, 
  PieChart as PieIcon,
  ShieldAlert,
  ArrowRight,
  Eye,
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

export const AdminAuditPage = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [systemOverview, setSystemOverview] = useState(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const [hospitalDetail, setHospitalDetail] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchHosp, setSearchHosp] = useState('');

  // Export states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  useEffect(() => {
    fetchSystemOverview();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedHospitalId) {
      fetchHospitalDetail(selectedHospitalId);
    } else {
      setHospitalDetail(null);
    }
  }, [selectedHospitalId, selectedYear, selectedMonth]);

  const fetchSystemOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await apiClient.get(`/audit/admin-overview?year=${selectedYear}&month=${selectedMonth}`);
      setSystemOverview(res.data);
    } catch (e) {
      toast.error('Failed to load system-wide medical waste audit data.');
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchHospitalDetail = async (hospId) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/audit/monthly?hospital_id=${hospId}&year=${selectedYear}&month=${selectedMonth}`);
      setHospitalDetail(res.data);
    } catch (e) {
      toast.error('Failed to load facility audit detail.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadPdf = async (hospId = null) => {
    setDownloadingPdf(true);
    try {
      const query = hospId ? `hospital_id=${hospId}&` : (selectedHospitalId ? `hospital_id=${selectedHospitalId}&` : '');
      const res = await apiClient.get(
        `/audit/report/pdf?${query}year=${selectedYear}&month=${selectedMonth}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BMW_Audit_Salem_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Statutory Audit PDF Report downloaded.');
    } catch (e) {
      toast.error('Failed to generate PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async (hospId = null) => {
    setDownloadingCsv(true);
    try {
      const query = hospId ? `hospital_id=${hospId}&` : (selectedHospitalId ? `hospital_id=${selectedHospitalId}&` : '');
      const res = await apiClient.get(
        `/audit/report/csv?${query}year=${selectedYear}&month=${selectedMonth}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BMW_Audit_Salem_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tabular CSV Audit Manifest downloaded.');
    } catch (e) {
      toast.error('Failed to generate CSV report.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const hospitalsList = systemOverview?.hospitals_summary || [];
  const filteredHospitals = hospitalsList.filter(h =>
    !searchHosp ||
    h.hospital_name.toLowerCase().includes(searchHosp.toLowerCase()) ||
    h.hospital_address.toLowerCase().includes(searchHosp.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Central Directorate Command</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Monthly Hospital Medical-Waste Audit Overview</h1>
          <p className="text-xs text-slate-500">
            System-wide oversight across all certified healthcare facilities in Salem, Tamil Nadu pursuant to Bio-Medical Waste Management Rules, 2016.
          </p>
        </div>

        {/* Period Selector & Global Export */}
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

          <button
            type="button"
            onClick={() => handleDownloadPdf()}
            disabled={downloadingPdf || loadingOverview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export PDF Report
          </button>

          <button
            type="button"
            onClick={() => handleDownloadCsv()}
            disabled={downloadingCsv || loadingOverview}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloadingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
            Export CSV
          </button>
        </div>
      </div>

      {loadingOverview ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-xs font-semibold uppercase">Aggregating State Directorate Manifests...</p>
        </div>
      ) : (
        <>
          {/* Directorate KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Salem Waste</p>
              <p className="text-xl font-black text-slate-900 mt-1">{systemOverview?.total_system_waste_kg || 0} kg</p>
              <p className="text-[10px] text-purple-600 font-semibold mt-0.5">{systemOverview?.total_hospitals || 0} facilities</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Sharps (White)</p>
              <p className="text-xl font-black text-slate-900 mt-1">{systemOverview?.total_sharps_kg || 0} kg</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Needles & scalpels</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600">Anatomical</p>
              <p className="text-xl font-black text-slate-900 mt-1">{systemOverview?.total_anatomical_kg || 0} kg</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Incinerable bio-tissue</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Cytotoxic</p>
              <p className="text-xl font-black text-slate-900 mt-1">{systemOverview?.total_cytotoxic_kg || 0} kg</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Oncology medication</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">General Waste</p>
              <p className="text-xl font-black text-slate-900 mt-1">{systemOverview?.total_general_kg || 0} kg</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Municipal non-infectious</p>
            </div>

            <div className={`p-4 rounded-3xl border shadow-soft ${
              (systemOverview?.total_inconsistencies || 0) > 0 
                ? 'bg-rose-50/70 border-rose-200' 
                : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Segregation Warnings</p>
              <p className={`text-xl font-black mt-1 ${
                (systemOverview?.total_inconsistencies || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}>
                {systemOverview?.total_inconsistencies || 0}
              </p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                {(systemOverview?.total_inconsistencies || 0) > 0 ? 'Action Required' : '100% Segregated'}
              </p>
            </div>
          </div>

          {/* Hospital Comparison Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Certified Healthcare Facilities in Salem</h3>
                <p className="text-xs text-slate-500">Click any hospital to inspect detailed category breakdowns, sorting warnings, and compliance records.</p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchHosp}
                  onChange={(e) => setSearchHosp(e.target.value)}
                  placeholder="Search hospital or locality..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Hospital Facility</th>
                    <th className="py-3 px-3">Salem Address</th>
                    <th className="py-3 px-3">Total Waste (kg)</th>
                    <th className="py-3 px-3">Sharps</th>
                    <th className="py-3 px-3">Anatomical</th>
                    <th className="py-3 px-3">Cytotoxic</th>
                    <th className="py-3 px-3">Warnings</th>
                    <th className="py-3 px-3 text-right">Audit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredHospitals.map(h => {
                    const isSelected = selectedHospitalId === h.hospital_id;
                    return (
                      <tr 
                        key={h.hospital_id} 
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-purple-50/70 border-l-4 border-purple-600' : 'hover:bg-slate-50/60'
                        }`}
                        onClick={() => setSelectedHospitalId(isSelected ? null : h.hospital_id)}
                      >
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {h.hospital_name}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                          {h.hospital_address}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          {h.total_waste_kg} kg
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-600">
                          {h.total_sharps_kg} kg
                        </td>
                        <td className="py-3 px-3 font-bold text-yellow-600">
                          {h.total_anatomical_kg} kg
                        </td>
                        <td className="py-3 px-3 font-bold text-purple-600">
                          {h.total_cytotoxic_kg} kg
                        </td>
                        <td className="py-3 px-3">
                          {h.warnings_count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10px]">
                              <AlertTriangle className="w-3 h-3" />
                              {h.warnings_count} Warnings
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              Compliant
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHospitalId(isSelected ? null : h.hospital_id);
                            }}
                            className="text-purple-600 hover:text-purple-800 font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            {isSelected ? 'Collapse' : 'Inspect'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPdf(h.hospital_id);
                            }}
                            className="text-slate-500 hover:text-slate-800 font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inspected Hospital Detailed Audit View */}
          {selectedHospitalId && hospitalDetail && (
            <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-200 shadow-soft space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-white px-2.5 py-1 rounded-full border border-purple-200">
                    Inspecting Facility Audit
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1.5">{hospitalDetail.hospital_name}</h2>
                  <p className="text-xs text-slate-500">{hospitalDetail.hospital_address}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(hospitalDetail.hospital_id)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Facility PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv(hospitalDetail.hospital_id)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download Facility CSV
                  </button>
                </div>
              </div>

              {/* Warnings alert for inspected facility */}
              {hospitalDetail.warnings && hospitalDetail.warnings.length > 0 && (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-2">
                  <h4 className="text-xs font-bold text-rose-800 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Segregation Inconsistencies for {hospitalDetail.hospital_name} ({hospitalDetail.warnings.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {hospitalDetail.warnings.map(w => (
                      <div key={w.record_id} className="bg-white p-3 rounded-xl border border-rose-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>Batch #{w.record_id}: {w.waste_type}</span>
                          <span>{w.quantity} kg</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>Recorded: <b>{w.selected_category}</b></span>
                          <span>➔</span>
                          <span className="text-emerald-700">Recommended: <b>{w.recommended_category}</b></span>
                        </div>
                        <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded">{w.warning_reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Records table for inspected hospital */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">Logged Batches ({hospitalDetail.records.length})</h4>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-2">ID</th>
                        <th className="py-2 px-2">Category</th>
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2">Quantity</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hospitalDetail.records.map(r => (
                        <tr key={r.id}>
                          <td className="py-2 px-2 font-mono">#{r.id}</td>
                          <td className="py-2 px-2"><WasteCategoryBadge category={r.category} size="sm" /></td>
                          <td className="py-2 px-2 font-medium">{r.waste_type}</td>
                          <td className="py-2 px-2 font-bold">{r.quantity} {r.unit}</td>
                          <td className="py-2 px-2">{r.pickup_status || 'Logged'}</td>
                          <td className="py-2 px-2">
                            {r.has_sorting_warning ? (
                              <span className="text-rose-600 font-bold text-[10px]">⚠️ Warning</span>
                            ) : (
                              <span className="text-emerald-600 font-bold text-[10px]">✓ OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Statutory Regulatory Advisory Notice */}
          <div className="bg-slate-100/90 p-4 rounded-2xl border border-slate-200 flex items-start gap-3 text-slate-600 text-xs">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>Regulatory Disclaimer:</b> {systemOverview?.regulatory_disclaimer}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAuditPage;
