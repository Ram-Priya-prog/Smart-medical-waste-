import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  LogOut, 
  User, 
  Building2, 
  Truck, 
  Sparkles,
  Menu,
  Activity
} from 'lucide-react';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, isHospital, isCollector, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (isAdmin) return <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-purple-200">ADMIN</span>;
    if (isHospital) return <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-teal-200">HOSPITAL</span>;
    if (isCollector) return <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">COLLECTOR</span>;
    return null;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                MedWaste<span className="text-teal-600">Smart</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">AI</span>
              </span>
              <span className="block text-[10px] text-slate-500 font-medium -mt-1 hidden sm:block">
                Smart India Healthcare Waste Portal
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs font-bold text-slate-800">{user.name}</span>
                  {getRoleBadge()}
                </div>
                <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{user.email}</p>
              </div>

              <Link
                to="/profile"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                title="View Profile"
              >
                <User className="w-4 h-4" />
              </Link>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-teal-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register/hospital"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
