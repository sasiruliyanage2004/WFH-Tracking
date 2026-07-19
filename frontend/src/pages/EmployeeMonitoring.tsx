import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import CustomLoader from '../components/CustomLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function EmployeeMonitoring() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state: any) => state.auth);
  // States
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Default to today
  });
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [appUsage, setAppUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Deletion selection states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === screenshots.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(screenshots.map((ss) => ss._id || ss.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} screenshot(s)?`)) return;
    
    try {
      setDeleteLoading(true);
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/monitoring/screenshots/delete-bulk`, { ids: selectedIds }, authHeader);
      
      // Update local screenshots list
      setScreenshots((prev) => prev.filter((ss) => !selectedIds.includes(ss._id || ss.id)));
      
      // Reset state
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err: any) {
      console.error('Failed to delete screenshots:', err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchEmployeeDetails = async (isManualRefresh = false) => {
    const cacheBuster = isManualRefresh ? `&_t=${Date.now()}` : '';
    const cacheBusterFirst = isManualRefresh ? `?_t=${Date.now()}` : '';

    try {
      if (!isManualRefresh) setLoading(true);
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Get attendance history for the selected date
        const attRes = await axios.get(`${API_URL}/api/attendance/all?employeeId=${employeeId}&date=${selectedDate}${cacheBuster}`, authHeader);
        setAttendance(attRes.data);

        // 2. Set employee info (fetch from general history if selected date is empty)
        if (attRes.data.length > 0) {
          setEmployeeInfo(attRes.data[0].employee);
        } else if (!employeeInfo) {
          const allAttRes = await axios.get(`${API_URL}/api/attendance/all?employeeId=${employeeId}${cacheBuster}`, authHeader);
          if (allAttRes.data.length > 0) {
            setEmployeeInfo(allAttRes.data[0].employee);
          }
        }

        // 3. Get screenshots for the selected date
        const ssRes = await axios.get(`${API_URL}/api/monitoring/screenshots/${employeeId}?date=${selectedDate}${cacheBuster}`, authHeader);
        setScreenshots(ssRes.data);

        // 4. Get activity logs
        const actRes = await axios.get(`${API_URL}/api/monitoring/activity/${employeeId}${cacheBusterFirst}`, authHeader);
        setActivity(actRes.data);

        // 5. Get app usage logs for the selected date
        const usageRes = await axios.get(`${API_URL}/api/monitoring/usage/${employeeId}?date=${selectedDate}${cacheBuster}`, authHeader);
        setAppUsage(usageRes.data);

    } catch (err: any) {
      console.error('Failed to load employee details:', err.message);
    } finally {
      if (!isManualRefresh) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, token, selectedDate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <CustomLoader />
      </div>
    );
  }
  
  // Get most recent check-in location coords
  const latestCheckin = attendance.length > 0 ? attendance[0] : null;
  const latitude = latestCheckin?.location?.latitude || 40.7128;
  const longitude = latestCheckin?.location?.longitude || -74.0060;
  const mapAddress = latestCheckin?.location?.address || (latestCheckin ? 'No location logged' : 'Employee did not check in on this date');

  // Get productivity score for selected date
  const selectedDateActivity = activity.find(act => act.date === selectedDate);
  const prodScore = selectedDateActivity ? selectedDateActivity.productivityPercentage : (latestCheckin ? 100 : 0);

  // Embeddable Google Map URL without API Key
  const googleMapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  // App usage stats calculations
  const totalUsageMins = appUsage.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const productiveMins = appUsage.filter(item => item.type === 'Productive').reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const unproductiveMins = appUsage.filter(item => item.type === 'Unproductive').reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const neutralMins = appUsage.filter(item => item.type === 'Neutral').reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);

  const productivePct = totalUsageMins > 0 ? (productiveMins / totalUsageMins) * 100 : 0;
  const unproductivePct = totalUsageMins > 0 ? (unproductiveMins / totalUsageMins) * 100 : 0;
  const neutralPct = totalUsageMins > 0 ? (neutralMins / totalUsageMins) * 100 : 0;

  const formatDuration = (mins: number) => {
    if (mins < 1) {
      const secs = Math.round(mins * 60);
      return `${secs} sec${secs !== 1 ? 's' : ''}`;
    }
    if (mins >= 60) {
      const hrs = mins / 60;
      return `${hrs.toFixed(1)} hr${hrs !== 1 ? 's' : ''}`;
    }
    return `${Math.round(mins)} min${Math.round(mins) !== 1 ? 's' : ''}`;
  };
  
  // Format dates
  const getFormattedTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="pb-8 space-y-6 animate-fade-in text-on-surface">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/manager/dashboard')}
            className="p-2 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-primary"
            title="Back to Dashboard"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          {employeeInfo?.profilePic ? (
            <img 
              src={employeeInfo.profilePic.startsWith('http') ? employeeInfo.profilePic : `${API_URL}${employeeInfo.profilePic}`} 
              alt={employeeInfo?.name} 
              className="w-14 h-14 rounded-full object-cover border-2 border-primary/50"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/50">
              {employeeInfo?.name?.charAt(0) || 'E'}
            </div>
          )}
          
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {employeeInfo?.name || 'Loading Employee...'}
              {latestCheckin && !latestCheckin.checkOutTime && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </h1>
            <p className="text-secondary/80 flex items-center gap-1 text-sm">
              <span className="material-symbols-outlined text-[16px]">badge</span>
              {employeeInfo?.role || 'Employee'} • {employeeInfo?.department || 'Department'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto bg-surface-variant/50 p-2 rounded-xl border border-white/5">
          <button 
            onClick={() => fetchEmployeeDetails(true)}
            className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors flex items-center justify-center group"
            title="Refresh Data"
          >
            <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">refresh</span>
          </button>
          
          <div className="h-8 w-px bg-white/10"></div>
          
          <div className="flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-secondary/70 text-sm">calendar_today</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="bg-transparent border-none text-white focus:ring-0 cursor-pointer text-sm font-medium [color-scheme:dark]"
            />
          </div>
        </div>
      </div>
      
      {latestCheckin?.is_auto_checkout && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-4 rounded-xl flex items-start gap-3 backdrop-blur-md">
          <span className="material-symbols-outlined text-amber-500">warning</span>
          <div>
            <strong className="block text-amber-400 mb-1">Auto-Checkout Triggered</strong>
            <span className="text-sm">This employee's session was automatically checked out due to laptop sleep, shutdown, or extended disconnection.</span>
          </div>
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-ai p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-secondary/80 text-sm font-medium">Productivity Score</span>
            <div className={`p-1.5 rounded-lg ${prodScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' : prodScore >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
              <span className="material-symbols-outlined text-[20px]">speed</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <h2 className="text-3xl font-bold text-white">{Math.round(prodScore)}</h2>
            <span className="text-secondary font-medium">%</span>
          </div>
          
          <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${prodScore >= 70 ? 'bg-emerald-500' : prodScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
              style={{ width: `${prodScore}%` }}
            ></div>
          </div>
        </div>

        <div className="glass-card-ai p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-secondary/80 text-sm font-medium">App Usage</span>
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <span className="material-symbols-outlined text-[20px]">apps</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <h2 className="text-3xl font-bold text-white">{appUsage.length}</h2>
            <span className="text-secondary font-medium">apps</span>
          </div>
          <p className="text-xs text-secondary/70 mt-2 mt-auto">Logged today</p>
        </div>

        <div className="glass-card-ai p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-secondary/80 text-sm font-medium">Check In</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <span className="material-symbols-outlined text-[20px]">login</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white truncate">
            {latestCheckin?.checkInTime ? getFormattedTime(latestCheckin.checkInTime) : '--:--'}
          </h2>
          <p className="text-xs text-secondary/70 mt-2 mt-auto">First seen today</p>
        </div>

        <div className="glass-card-ai p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-secondary/80 text-sm font-medium">Security</span>
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <span className="material-symbols-outlined text-[20px]">shield</span>
            </div>
          </div>
          
          {selectedDateActivity?.suspiciousMouseEvents > 0 ? (
            <div>
              <h2 className="text-xl font-bold text-red-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-lg">warning</span>
                Flagged
              </h2>
              <p className="text-xs text-red-400/80 mt-1">{selectedDateActivity.suspiciousMouseEvents} suspicious events</p>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-lg">verified_user</span>
                Secure
              </h2>
              <p className="text-xs text-secondary/70 mt-1">No alerts today</p>
            </div>
          )}
        </div>
      </div>

      {/* Verification Row: Map and Selfie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">my_location</span>
            Check-in Location
          </h3>
          <p className="text-sm text-secondary/80 mb-4 bg-white/5 p-3 rounded-lg flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">location_on</span>
            {mapAddress}
          </p>
          <div className="w-full h-64 rounded-xl overflow-hidden border border-white/10 relative group">
            <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors pointer-events-none z-10"></div>
            <iframe
              title="Employee CheckIn GPS Map"
              src={googleMapEmbedUrl}
              className="w-full h-full border-0 grayscale invert opacity-80 group-hover:grayscale-0 group-hover:invert-0 group-hover:opacity-100 transition-all duration-500"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">face</span>
            Verification Selfie
          </h3>
          <div className="w-full h-80 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center relative">
            {latestCheckin?.webcamImage ? (
              <img
                src={latestCheckin.webcamImage.startsWith('http') ? latestCheckin.webcamImage : `${API_URL}${latestCheckin.webcamImage}`}
                alt="Verification Selfie"
                className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-500"
                onClick={() => setSelectedImage(latestCheckin.webcamImage.startsWith('http') ? latestCheckin.webcamImage : `${API_URL}${latestCheckin.webcamImage}`)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-secondary/50">
                <span className="material-symbols-outlined text-4xl mb-2">no_photography</span>
                <p>No selfie captured today</p>
              </div>
            )}
            
            {latestCheckin?.webcamImage && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-between items-end">
                <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded border border-primary/30 backdrop-blur-md">
                  Verified Match
                </span>
                <span className="text-white/70 text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {getFormattedTime(latestCheckin.checkInTime)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screenshots Section */}
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">screenshot_monitor</span>
            Live Screenshots
            <span className="bg-white/10 text-secondary text-xs px-2 py-0.5 rounded-full ml-2">
              {screenshots.length} total
            </span>
          </h3>
          
          <div className="flex gap-2">
            {isSelectMode ? (
              <>
                <button 
                  onClick={handleSelectAll} 
                  className="px-3 py-1.5 text-sm font-medium bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
                >
                  {selectedIds.length === screenshots.length ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  onClick={handleDeleteSelected} 
                  disabled={selectedIds.length === 0 || deleteLoading}
                  className="px-3 py-1.5 text-sm font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors border border-red-500/30 disabled:opacity-50 flex items-center gap-1"
                >
                  {deleteLoading ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">delete</span>}
                  Delete ({selectedIds.length})
                </button>
                <button 
                  onClick={() => { setIsSelectMode(false); setSelectedIds([]); }} 
                  className="px-3 py-1.5 text-sm font-medium bg-white/5 hover:bg-white/10 text-secondary rounded-lg transition-colors border border-white/10"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsSelectMode(true)}
                className="px-3 py-1.5 text-sm font-medium bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">checklist</span>
                Select Multiple
              </button>
            )}
          </div>
        </div>

        {screenshots.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/5 border-dashed">
            <span className="material-symbols-outlined text-4xl text-secondary/40 mb-3">image_not_supported</span>
            <p className="text-secondary/60 text-sm">No screenshots recorded for this date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {screenshots.map((ss) => {
              const sId = ss._id || ss.id;
              const isSelected = selectedIds.includes(sId);
              const imgUrl = ss.imageUrl.startsWith('http') ? ss.imageUrl : `${API_URL}${ss.imageUrl}`;
              
              return (
                <div 
                  key={sId} 
                  className={`group relative rounded-xl overflow-hidden aspect-video bg-black/40 border transition-all ${
                    isSelected ? 'border-primary shadow-[0_0_15px_rgba(0,225,171,0.3)] ring-2 ring-primary ring-offset-2 ring-offset-[#0B1120]' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt="Desktop capture"
                    className={`w-full h-full object-cover transition-transform duration-500 ${isSelectMode ? 'cursor-pointer' : 'cursor-zoom-in group-hover:scale-105'}`}
                    onClick={() => {
                      if (isSelectMode) toggleSelect(sId);
                      else setSelectedImage(imgUrl);
                    }}
                  />
                  
                  {isSelectMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-primary border-primary' : 'bg-black/50 border-white/50 backdrop-blur-sm'}`}>
                        {isSelected && <span className="material-symbols-outlined text-[14px] text-on-primary font-bold">check</span>}
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6 pointer-events-none">
                    <p className="text-xs text-white/90 font-medium flex justify-between items-center drop-shadow-md">
                      {new Date(ss.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* App & URL Usage Section */}
      <div className="glass-panel p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">pie_chart</span>
            App & URL Usage Analysis
          </h3>
          
          {appUsage.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-xs font-medium text-secondary mb-2">
                <span className="text-emerald-400">Productive ({Math.round(productivePct)}%)</span>
                <span className="text-slate-400">Neutral ({Math.round(neutralPct)}%)</span>
                <span className="text-amber-400">Unproductive ({Math.round(unproductivePct)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${productivePct}%` }} title="Productive"></div>
                <div className="bg-slate-400 h-full transition-all duration-1000" style={{ width: `${neutralPct}%` }} title="Neutral"></div>
                <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${unproductivePct}%` }} title="Unproductive"></div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-secondary">
            <thead className="text-xs uppercase bg-white/5 text-secondary border-y border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Application / URL</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Category</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Time Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {appUsage.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-secondary/60 bg-white/5">
                    No application usage data logged for this date.
                  </td>
                </tr>
              ) : (
                appUsage.sort((a, b) => b.duration_minutes - a.duration_minutes).map((app, index) => (
                  <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-white/5 shadow-sm">
                        <span className="material-symbols-outlined text-[18px] text-primary/70">
                          {app.app_name.includes('http') || app.app_name.includes('www.') || app.app_name.includes('.com') ? 'public' : 'desktop_windows'}
                        </span>
                      </div>
                      <span className="truncate max-w-[200px] md:max-w-[400px]" title={app.app_name}>
                        {app.app_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        app.type === 'Productive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        app.type === 'Unproductive' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-slate-500/10 text-slate-300 border-slate-500/20'
                      }`}>
                        {app.type || 'Neutral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white/90">
                      {formatDuration(app.duration_minutes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] flex flex-col items-center">
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img 
              src={selectedImage} 
              alt="Expanded view" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeMonitoring;
