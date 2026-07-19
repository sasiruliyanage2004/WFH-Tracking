import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import AnimatedCounter from '../components/AnimatedCounter';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ManagerDashboard() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state: any) => state.auth);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      
      const summaryRes = await axios.get(`${API_URL}/api/monitoring/summary`, authHeader);
      setSummary(summaryRes.data);

      const employeesRes = await axios.get(`${API_URL}/api/users/employees`, authHeader);
      setEmployees(employeesRes.data);

    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading || !summary) {
    return (
      <div className="p-xl flex items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pieData = [
    { name: 'Online', value: summary.onlineEmployees },
    { name: 'Offline', value: summary.offlineEmployees }
  ];

  const productivityTrendData = summary.weeklyTrend && summary.weeklyTrend.length > 0
    ? summary.weeklyTrend
    : [
        { day: 'Mon', score: 0 },
        { day: 'Tue', score: 0 },
        { day: 'Wed', score: 0 },
        { day: 'Thu', score: 0 },
        { day: 'Fri', score: summary.productivityScore || 0 }
      ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-sm rounded-lg border border-white/10 shadow-xl">
          <p className="font-bold text-on-surface mb-xs">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} className="text-primary font-bold text-sm">
              {pld.name}: {pld.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-lg lg:p-xl space-y-xl max-w-[1600px] mx-auto animate-fadeIn pb-32">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface tracking-tight">
            Team Dashboard
          </h1>
          <p className="text-on-surface-variant font-body-md mt-xs">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-sm">
          <button onClick={() => window.open('https://wfh-tracking-k5ap.vercel.app', '_blank')} className="neumorphic-button bg-primary/10 border border-primary/30 text-primary px-md py-sm rounded-xl font-bold flex items-center gap-xs hover:bg-primary hover:text-on-primary transition-all">
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Web Dashboard
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md">
        {/* Total Employees */}
        <div className="glass-card-ai p-md rounded-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex justify-between items-start mb-md">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <span className="material-symbols-outlined">group</span>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">Total</span>
          </div>
          <div>
            <h3 className="font-display-lg text-[40px] font-bold text-on-surface leading-none mb-xs">
              <AnimatedCounter value={summary.totalEmployees} />
            </h3>
            <p className="text-on-surface-variant font-label-md uppercase tracking-wider text-xs">Total Workforce</p>
          </div>
        </div>

        {/* Online Now */}
        <div className="glass-card-ai p-md rounded-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start mb-md relative z-10">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined">wifi</span>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-md border border-primary/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-display-lg text-[40px] font-bold text-primary leading-none mb-xs drop-shadow-[0_0_15px_rgba(78,222,163,0.5)]">
              <AnimatedCounter value={summary.onlineEmployees} />
            </h3>
            <p className="text-on-surface-variant font-label-md uppercase tracking-wider text-xs">Online Now</p>
          </div>
        </div>

        {/* Productivity Score */}
        <div className="glass-card-ai p-md rounded-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex justify-between items-start mb-md">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20">Weekly Avg</span>
          </div>
          <div>
            <h3 className="font-display-lg text-[40px] font-bold text-on-surface leading-none mb-xs">
              <AnimatedCounter value={summary.productivityScore} suffix="%" />
            </h3>
            <p className="text-on-surface-variant font-label-md uppercase tracking-wider text-xs">Productivity Score</p>
          </div>
        </div>

        {/* Pending Reports */}
        <div className="glass-card-ai p-md rounded-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex justify-between items-start mb-md">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">Needs Action</span>
          </div>
          <div>
            <h3 className="font-display-lg text-[40px] font-bold text-amber-400 leading-none mb-xs">
              <AnimatedCounter value={summary.pendingReportsCount} />
            </h3>
            <p className="text-on-surface-variant font-label-md uppercase tracking-wider text-xs">Pending Reports</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        
        {/* Productivity Chart */}
        <div className="glass-card-ai rounded-2xl p-md lg:col-span-2 border border-white/5">
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-display-lg text-headline-md text-on-surface">Productivity Trends</h3>
            <select className="bg-surface-dim border border-white/10 rounded-lg px-3 py-1 text-on-surface text-sm outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productivityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4edea3" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4edea3" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4edea3" 
                  strokeWidth={3} 
                  fillOpacity={1}
                  fill="url(#colorProd)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Status Chart */}
        <div className="glass-card-ai rounded-2xl p-md border border-white/5 flex flex-col">
          <h3 className="font-display-lg text-headline-md text-on-surface mb-md">Live Status</h3>
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#4edea3" /> {/* Online */}
                    <Cell fill="rgba(255, 255, 255, 0.05)" /> {/* Offline */}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Inner Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-primary">{summary.onlineEmployees}</span>
              <span className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManagerDashboard;
