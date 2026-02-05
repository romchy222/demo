import React, { useState } from 'react';
import { db } from '../services/dbService';
import { User } from '../types';
import { hashPassword, verifyPassword } from '../services/password';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('student@bolashak.kz');
  const [password, setPassword] = useState('password');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const user = db.users.findByEmail(email);
      if (user) {
        if (!verifyPassword(password, user.passwordHash)) {
          setError('Неверный пароль.');
          return;
        }
        onLogin(user);
      } else {
        setError('Пользователь не найден. Используйте student@bolashak.kz');
      }
    } else {
      if (!name || !email) return setError('Заполните все поля');
      if (!password || password.length < 6) return setError('Пароль должен быть минимум 6 символов.');
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name,
        role: 'STUDENT',
        passwordHash: hashPassword(password),
        joinedAt: new Date().toISOString()
      };
      db.users.create(newUser);
      onLogin(newUser);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-fade-in">
        <div className="p-8">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center text-3xl text-slate-900 shadow-xl mb-6">
                <i className="fas fa-graduation-cap"></i>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">BOLASHAK AI</h1>
            <p className="text-slate-500 text-sm mt-2">Экосистема интеллектуальных сервисов</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">ФИО</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm transition-all font-medium" 
                  placeholder="Ваше имя"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Email</label>
              <input 
                type="email" 
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm transition-all font-medium" 
                placeholder="university@bolashak.kz"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Пароль</label>
              <input 
                type="password" 
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 ring-amber-500/20 outline-none text-sm transition-all font-medium" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-xs font-bold text-rose-500 mt-2 px-1">{error}</p>}

            <button 
              type="submit" 
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
            >
              {isLogin ? 'Войти в систему' : 'Создать аккаунт'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-slate-400 hover:text-amber-600 transition-colors uppercase tracking-widest"
            >
              {isLogin ? 'У меня еще нет аккаунта' : 'У меня уже есть аккаунт'}
            </button>
          </div>
        </div>
        
        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                © 2025 Цифровой Департамент «Болашак»
            </p>
        </div>
      </div>
    </div>
  );
};
