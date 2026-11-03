import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Building2, 
  Truck, 
  Calendar,
  Lock
} from 'lucide-react';

export const ProfilePage = () => {
  const { user, isHospital, isCollector, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Account Credentials</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mt-1">User Profile & Permissions</h1>
        <p className="text-xs text-slate-500">
          Authenticated credentials, role authorization, and registered geographic coordinates.
        </p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xl">
            {isAdmin ? <ShieldCheck className="w-8 h-8 text-purple-600" /> :
             isCollector ? <Truck className="w-8 h-8 text-blue-600" /> :
             <Building2 className="w-8 h-8 text-teal-600" />}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                isAdmin ? 'bg-purple-100 text-purple-800' :
                isCollector ? 'bg-blue-100 text-blue-800' :
                'bg-teal-100 text-teal-800'
              }`}>
                {user.role}
              </span>
              <span className="text-xs text-slate-400">Account ID: #{user.id}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Email Address</span>
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{user.email}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Phone Number</span>
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{user.phone}</span>
            </div>
          </div>

          <div className="col-span-full p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Registered Physical Address</span>
            <div className="flex items-start gap-2 font-bold text-slate-800">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{user.address}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Geographic Latitude</span>
            <p className="font-mono font-bold text-slate-800">{user.latitude}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Geographic Longitude</span>
            <p className="font-mono font-bold text-slate-800">{user.longitude}</p>
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default ProfilePage;
