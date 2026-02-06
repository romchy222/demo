
import React, { useState } from 'react';
import { User } from '../types';
import { neonApi } from '../services/neonApi';
import { useT } from '../i18n/i18n';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const t = useT();
  const [name, setName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await neonApi.users.update(user.id, { name });
      onUpdate({ ...user, name });
      alert(t('profile.updated'));
    } catch (e: any) {
      alert(String(e?.message ?? 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                }`}>
                    {user.role}
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center text-4xl text-slate-300 border-4 border-white shadow-lg overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="Avatar" />
                    </div>
                    <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-xs text-slate-500 hover:text-amber-500">
                        <i className="fas fa-camera"></i>
                    </button>
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{user.name}</h2>
                    <p className="text-slate-500 font-medium">{user.email}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      {t('profile.registration')}: {new Date(user.joinedAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className="mt-12 space-y-6">
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('profile.fullName')}</label>
                    <input 
                        type="text" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm font-bold transition-all"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('profile.department')}</label>
                        <div className="w-full px-5 py-4 rounded-2xl bg-slate-100 text-slate-500 text-sm font-bold">
                            {user.department || t('profile.notSpecified')}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{t('profile.accessLevel')}</label>
                        <div className="w-full px-5 py-4 rounded-2xl bg-slate-100 text-slate-500 text-sm font-bold">
                            Tier {user.role === 'ADMIN' ? '3' : user.role === 'FACULTY' ? '2' : '1'}
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
                        {t('profile.save')}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
