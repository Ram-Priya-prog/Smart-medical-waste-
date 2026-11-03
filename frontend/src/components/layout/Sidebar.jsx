import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Trash2, 
  CalendarPlus, 
  Navigation, 
  History, 
  BarChart3, 
  User, 
  Building2, 
  Truck, 
  ClipboardList, 
  MapPin, 
  Cpu, 
  LogOut,
  X,
  AlertCircle,
  FileCheck,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isHospital, isCollector, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Hospital Links
  const hospitalNav = [
    { to: '/hospital/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/hospital/waste', icon: Trash2, label: 'Waste Management' },
    { to: '/hospital/audit', icon: FileCheck, label: 'Monthly Waste Audit' },
    { to: '/hospital/schedule', icon: CalendarPlus, label: 'Schedule Pickup' },
    { to: '/hospital/active-pickup', icon: Navigation, label: 'Active Pickup' },
    { to: '/hospital/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/hospital/history', icon: History, label: 'Collection History' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  // Collector Links
  const collectorNav = [
    { to: '/collector/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/collector/route', icon: Sparkles, label: 'Optimized Route' },
    { to: '/collector/assigned', icon: ClipboardList, label: 'Assigned Pickups' },
    { to: '/collector/active-pickup', icon: Navigation, label: 'Active Pickup' },
    { to: '/collector/history', icon: History, label: 'Collection History' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  // Admin Links
  const adminNav = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/route-optimization', icon: Sparkles, label: 'Route Optimization' },
    { to: '/admin/audit', icon: FileCheck, label: 'Monthly Waste Audit' },
    { to: '/admin/hospitals', icon: Building2, label: 'Hospitals' },
    { to: '/admin/collectors', icon: Truck, label: 'Collectors' },
    { to: '/admin/pickups', icon: ClipboardList, label: 'Pickup Requests' },
    { to: '/admin/tracking', icon: MapPin, label: 'Live Tracking' },
    { to: '/admin/history', icon: History, label: 'Collection History' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const currentNav = isHospital ? hospitalNav : (isCollector ? collectorNav : adminNav);

  const getRoleHeader = () => {
    if (isAdmin) return { title: 'Admin Command', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50' };
    if (isHospital) return { title: 'Hospital Portal', icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' };
    return { title: 'Collector Hub', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' };
  };

  const roleInfo = getRoleHeader();
  const HeaderIcon = roleInfo.icon;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Role Header Banner */}
          <div className={`p-3 rounded-xl ${roleInfo.bg} border border-slate-200/60 flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center ${roleInfo.color}`}>
                <HeaderIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{roleInfo.title}</p>
                <p className="text-[10px] text-slate-500 font-medium">Smart Medical Logistics</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {currentNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all
                    ${isActive 
                      ? 'bg-teal-600 text-white shadow-xs shadow-teal-500/20' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User info & Quick logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.role.toUpperCase()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
