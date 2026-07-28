import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserContextType } from './types';
import Dashboard from './components/Dashboard';
import DataEntry from './components/DataEntry';
import ManageDepts from './components/ManageDepts';
import { LayoutDashboard, PenSquare, Building2, LogOut, Lock, Menu } from 'lucide-react';
import clsx from 'clsx';

export const UserContext = createContext<UserContextType | null>(null);

function AppContent() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'entry' | 'depts'>('dashboard');
  const userCtx = useContext(UserContext);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isAdmin = userCtx?.user?.role === 'admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (userCtx) {
      const success = await userCtx.login(password);
      if (success) {
        setShowLoginModal(false);
        setPassword('');
      } else {
        setLoginError('Mật khẩu không đúng');
      }
    }
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 text-white z-20 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-cyan-400 leading-tight uppercase tracking-wider">Y HỌC CỔ TRUYỀN BẢO LỘC</h1>
            <p className="text-xs text-slate-400 mt-0.5">Hệ thống quản lý số liệu</p>
          </div>
        </div>
        <h2 className="hidden md:block text-sm font-medium text-slate-400 bg-slate-800/50 px-4 py-1.5 rounded-full">
          {currentTab === 'dashboard' && 'Tổng quan số liệu'}
          {currentTab === 'entry' && 'Nhập số liệu báo cáo'}
          {currentTab === 'depts' && 'Quản lý danh mục khoa'}
        </h2>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={clsx(
          "bg-slate-900 text-white flex flex-col shadow-xl shrink-0 transition-all duration-300 ease-in-out z-10",
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden"
        )}>
          <nav className="flex-1 py-4 space-y-1 w-64">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={clsx(
                "w-full flex items-center gap-3 px-6 py-3 transition-all cursor-pointer",
                currentTab === 'dashboard' ? "bg-cyan-600/10 border-l-4 border-cyan-500 font-medium text-white" : "hover:bg-slate-800 text-slate-400 border-l-4 border-transparent"
              )}
            >
              <LayoutDashboard size={20} className={currentTab === 'dashboard' ? 'text-cyan-400' : ''} /> Tổng quan Dashboard
            </button>
            <button
              onClick={() => {
                if (isAdmin) setCurrentTab('entry');
                else setShowLoginModal(true);
              }}
              className={clsx(
                "w-full flex items-center justify-between px-6 py-3 transition-all cursor-pointer",
                currentTab === 'entry' ? "bg-cyan-600/10 border-l-4 border-cyan-500 font-medium text-white" : "hover:bg-slate-800 text-slate-400 border-l-4 border-transparent"
              )}
            >
              <div className="flex items-center gap-3"><PenSquare size={20} className={currentTab === 'entry' ? 'text-cyan-400' : ''} /> Nhập chỉ tiêu mới</div>
              {!isAdmin && <Lock size={16} className="text-slate-500" />}
            </button>
            <button
              onClick={() => {
                if (isAdmin) setCurrentTab('depts');
                else setShowLoginModal(true);
              }}
              className={clsx(
                "w-full flex items-center justify-between px-6 py-3 transition-all cursor-pointer",
                currentTab === 'depts' ? "bg-cyan-600/10 border-l-4 border-cyan-500 font-medium text-white" : "hover:bg-slate-800 text-slate-400 border-l-4 border-transparent"
              )}
            >
              <div className="flex items-center gap-3"><Building2 size={20} className={currentTab === 'depts' ? 'text-cyan-400' : ''} /> Quản lý Khoa</div>
              {!isAdmin && <Lock size={16} className="text-slate-500" />}
            </button>
          </nav>
          <div className="p-4 bg-slate-800/50 w-64">
            {isAdmin ? (
              <button
                onClick={() => userCtx?.logout()}
                className="w-full flex items-center space-x-2 text-xs text-rose-400 hover:text-rose-300 transition-colors p-2 rounded hover:bg-slate-800"
              >
                <LogOut size={16} /> <span>Đăng xuất (Quản trị)</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full flex items-center space-x-2 text-xs text-slate-300 hover:text-white transition-colors p-2 rounded hover:bg-slate-800"
              >
                <Lock size={16} /> <span>Đăng nhập quản trị</span>
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-auto p-6 lg:p-8 relative">
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'entry' && isAdmin && <DataEntry />}
          {currentTab === 'depts' && isAdmin && <ManageDepts />}
        </main>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Đăng nhập Quản trị</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                  {loginError && <p className="text-rose-500 text-sm mt-2">{loginError}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl font-medium transition-colors shadow-sm"
                  >
                    Đăng nhập
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      });
  }, []);

  const login = async (password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success) {
      setUser({ role: 'admin' });
      return true;
    }
    return false;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <UserContext.Provider value={{ user, login, logout, loading }}>
      <AppContent />
    </UserContext.Provider>
  );
}
