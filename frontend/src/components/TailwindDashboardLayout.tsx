import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/store';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function TailwindDashboardLayout({ children }: any) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: any) => state.auth);

  const [notifications, setNotifications] = useState<any[]>([]);

  // Socket Connection and Notifications
  useEffect(() => {
    if (!token || !user) return;
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (err: any) {
        console.error('Failed to load notifications:', err.message);
      }
    };
    fetchNotifications();

    const socket = io(API_URL);
    socket.emit('register', user.id);
    socket.on('notification', (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });
    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  const isDesktop = !!(window as any).api;

  const links = [
    { text: 'Team Dashboard', icon: 'dashboard', path: '/manager/dashboard' },
    { text: 'Employee List', icon: 'groups', path: '/manager/employees' },
    { text: 'Admin List', icon: 'badge', path: '/manager/admins' },
    { text: 'Super Admin List', icon: 'security', path: '/manager/superadmins' },
    { text: 'Task Management', icon: 'assignment', path: '/manager/tasks' },
    { text: 'Work Reports', icon: 'assessment', path: '/manager/reports' },
    { text: 'Employee Monitor', icon: 'monitoring', path: '/manager/monitoring' }
  ];

  const visibleLinks = links.filter((link) => {
    if (link.text === 'Admin List' || link.text === 'Super Admin List') return user?.role === 'SuperAdmin';
    return true;
  });

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      {/* SIDE NAV BAR */}
      <aside className="h-screen w-72 fixed left-0 top-0 border-r border-white/5 backdrop-blur-xl bg-surface-container-low/60 shadow-[20px_0_40px_rgba(0,0,0,0.4)] z-50 flex flex-col py-md px-sm">
        <div className="flex items-center gap-sm mb-xl px-sm">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(78,222,163,0.5)]">
            <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
          </div>
          <div>
            <h1 className="font-display-lg text-headline-md tracking-tight text-primary leading-tight">WorkforceOS</h1>
            <p className="font-label-md text-label-md text-on-surface-variant opacity-70">Enterprise Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-xs overflow-y-auto pr-2">
          {visibleLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.text}
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-sm p-sm rounded-xl transition-all duration-300 active:scale-[0.97] ${
                  isActive
                    ? 'border-l-4 border-primary bg-primary/10 text-primary drop-shadow-[0_0_15px_rgba(78,222,163,0.3)] font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 hover:backdrop-blur-md'
                }`}
              >
                <span className="material-symbols-outlined">{link.icon}</span>
                <span className="font-label-md text-label-md">{link.text}</span>
              </button>
            );
          })}

          <div className="pt-md mt-md border-t border-white/5 space-y-xs">
            {user?.role === 'SuperAdmin' && (
              <>
                <button onClick={() => navigate('/manager/settings')} className="w-full flex items-center gap-sm p-sm rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 transition-all active:scale-[0.97]">
                  <span className="material-symbols-outlined">settings</span>
                  <span className="font-label-md text-label-md">Settings</span>
                </button>
                <button onClick={() => navigate('/company/settings')} className="w-full flex items-center gap-sm p-sm rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 transition-all active:scale-[0.97]">
                  <span className="material-symbols-outlined">domain</span>
                  <span className="font-label-md text-label-md">Company Settings</span>
                </button>
              </>
            )}
            <button onClick={() => dispatch(logout())} className="w-full flex items-center gap-sm p-sm rounded-xl text-error hover:bg-error/10 transition-all active:scale-[0.97]">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-label-md text-label-md">Logout</span>
            </button>
          </div>
        </nav>

        <div className="mt-auto p-sm">
          <div className="glass-panel p-sm rounded-xl flex items-center gap-sm cursor-pointer hover:bg-surface-bright/50 transition-colors" onClick={() => navigate('/profile')}>
            <div className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center bg-primary/20 text-primary font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="overflow-hidden text-left">
              <p className="font-label-md text-on-surface truncate">{user?.name}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <main className="ml-72 min-h-screen relative flex flex-col">
        {/* TOP APP BAR */}
        <header className="flex justify-between items-center px-md py-sm h-20 sticky top-0 z-40 bg-surface-dim/40 backdrop-blur-2xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-headline-md text-primary">
              {visibleLinks.find(l => l.path === location.pathname)?.text || 'Dashboard'}
            </h2>
            {location.pathname === '/manager/monitoring' && (
              <span className="px-xs py-[2px] bg-primary/10 text-primary text-[10px] font-bold rounded border border-primary/20 tracking-tighter">LIVE FEED</span>
            )}
          </div>

          <div className="flex items-center gap-md">
            <div className="neumorphic-inset flex items-center px-md py-xs rounded-full w-80 group focus-within:ring-2 focus-within:ring-primary/50 transition-all duration-300">
              <span className="material-symbols-outlined text-on-surface-variant text-base mr-sm group-hover:text-primary transition-colors">search</span>
              <input type="text" placeholder="Search operations..." className="bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 text-label-md w-full outline-none" />
            </div>

            <div className="flex items-center gap-sm relative">
              <button className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95 relative">
                <span className="material-symbols-outlined">notifications</span>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse"></span>
                )}
              </button>
              <button onClick={() => navigate('/profile')} className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95">
                <span className="material-symbols-outlined">account_circle</span>
              </button>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

export default TailwindDashboardLayout;
