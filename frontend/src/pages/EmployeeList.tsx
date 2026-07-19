import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function EmployeeList() {
  const { token } = useSelector((state: any) => state.auth);
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmpData, setNewEmpData] = useState({ name: '', email: '', department: 'Engineering', role: 'Employee' });
  const [addingEmp, setAddingEmp] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/users/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
      setFiltered(res.data);
    } catch (err: any) {
      console.error('Failed to fetch employees:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    let result = [...employees];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'All') {
      result = result.filter(e => e.department === deptFilter);
    }
    if (statusFilter !== 'All') {
      if (statusFilter === 'On Break') {
        result = result.filter(e => e.todayStatus?.startsWith('On Break'));
      } else {
        result = result.filter(e => e.todayStatus === statusFilter);
      }
    }
    setFiltered(result);
  }, [search, deptFilter, statusFilter, employees]);

  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))];

  const totalActive = employees.filter(e => e.todayStatus === 'Active').length;
  const totalAbsent = employees.filter(e => e.todayStatus === 'Absent').length;
  const totalOnBreak = employees.filter(e => e.todayStatus?.startsWith('On Break')).length;

  const handleAddEmployee = async () => {
    try {
      setAddingEmp(true);
      const res = await axios.post(`${API_URL}/api/users/employees`, newEmpData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(prev => [res.data.user, ...prev]);
      setAddModalOpen(false);
      setNewEmpData({ name: '', email: '', department: 'Engineering', role: 'Employee' });
      alert(`Employee added! Tell them to login with email: ${res.data.user.email} and password: password1234`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add employee');
    } finally {
      setAddingEmp(false);
    }
  };

  if (loading) {
    return (
      <div className="p-xl flex items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-lg lg:p-xl space-y-xl max-w-[1600px] mx-auto animate-fadeIn pb-32">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface tracking-tight">
            User Management
          </h1>
          <p className="text-on-surface-variant font-body-md mt-xs">
            {employees.length} total personnel • Organization-wide access control
          </p>
        </div>
        <div className="flex gap-sm">
          <button onClick={() => setAddModalOpen(true)} className="neumorphic-button bg-primary border border-primary text-on-primary px-md py-sm rounded-xl font-bold flex items-center gap-xs hover:bg-primary-container transition-all">
            <span className="material-symbols-outlined text-sm">person_add</span>
            Add Personnel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="glass-card-ai p-md rounded-2xl border border-white/5">
          <p className="text-on-surface-variant font-label-md uppercase tracking-wider mb-2">Total Staff</p>
          <h3 className="font-display-lg text-4xl text-on-surface">{employees.length}</h3>
        </div>
        <div className="glass-card-ai p-md rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <p className="text-primary font-label-md uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Active Now
          </p>
          <h3 className="font-display-lg text-4xl text-primary">{totalActive}</h3>
        </div>
        <div className="glass-card-ai p-md rounded-2xl border border-white/5">
          <p className="text-on-surface-variant font-label-md uppercase tracking-wider mb-2">On Break</p>
          <h3 className="font-display-lg text-4xl text-amber-400">{totalOnBreak}</h3>
        </div>
        <div className="glass-card-ai p-md rounded-2xl border border-white/5">
          <p className="text-on-surface-variant font-label-md uppercase tracking-wider mb-2">Absent</p>
          <h3 className="font-display-lg text-4xl text-error">{totalAbsent}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card-ai p-sm rounded-2xl flex flex-col md:flex-row gap-sm border border-white/5">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input 
            type="text" 
            placeholder="Search personnel by name or email..." 
            className="w-full bg-surface-bright/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-on-surface outline-none focus:border-primary/50 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="bg-surface-bright/50 border border-white/10 rounded-xl px-4 py-2 text-on-surface outline-none focus:border-primary/50 transition-colors"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
        </select>
        <select 
          className="bg-surface-bright/50 border border-white/10 rounded-xl px-4 py-2 text-on-surface outline-none focus:border-primary/50 transition-colors"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="On Break">On Break</option>
          <option value="Checked Out">Checked Out</option>
          <option value="Absent">Absent</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card-ai rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-bright/30">
              <tr>
                <th className="px-md py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-widest border-b border-white/5">Name</th>
                <th className="px-md py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-widest border-b border-white/5">Email</th>
                <th className="px-md py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-widest border-b border-white/5">Department</th>
                <th className="px-md py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-widest border-b border-white/5">Role</th>
                <th className="px-md py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-widest border-b border-white/5">Status</th>
                <th className="px-md py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-widest border-b border-white/5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-xl text-on-surface-variant">No personnel found</td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  let statusColor = "bg-on-surface-variant/50";
                  let textColor = "text-on-surface-variant/50";
                  let dotClass = "w-2 h-2 rounded-full " + statusColor;
                  let displayStatus = (emp.todayStatus || 'Offline').toUpperCase();

                  if (emp.todayStatus === 'Active') {
                    statusColor = "bg-primary";
                    textColor = "text-primary";
                    dotClass = "w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#4edea3]";
                  } else if (emp.todayStatus?.startsWith('On Break')) {
                    statusColor = "bg-amber-400";
                    textColor = "text-amber-400";
                    dotClass = "w-2 h-2 rounded-full " + statusColor;
                  } else if (emp.todayStatus === 'Absent') {
                    statusColor = "bg-error";
                    textColor = "text-error";
                    dotClass = "w-2 h-2 rounded-full " + statusColor;
                  }

                  // Default profile picture logic
                  const initials = emp.name ? emp.name.charAt(0).toUpperCase() : '?';

                  return (
                    <tr key={emp._id} className="group hover:bg-primary/5 transition-colors duration-300">
                      <td className="px-md py-md">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {emp.profilePic ? (
                              <img className="w-10 h-10 rounded-full border border-white/10 object-cover" src={emp.profilePic} alt={emp.name} />
                            ) : (
                              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-surface-bright text-on-surface font-bold text-lg">
                                {initials}
                              </div>
                            )}
                            <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor} rounded-full border-2 border-surface-container ${emp.todayStatus === 'Active' ? 'shadow-[0_0_8px_#4edea3]' : ''}`}></div>
                          </div>
                          <div>
                            <p className="font-label-md text-on-surface">{emp.name}</p>
                            <p className="text-[10px] text-on-surface-variant/70 uppercase">ID: {emp._id.substring(0, 6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-md py-md font-body-md text-on-surface-variant">{emp.email}</td>
                      <td className="px-md py-md">
                        <span className="px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-[11px] font-bold border border-secondary/20">
                          {emp.department || 'N/A'}
                        </span>
                      </td>
                      <td className="px-md py-md font-body-md text-on-surface">{emp.role}</td>
                      <td className="px-md py-md">
                        <div className="flex items-center gap-2">
                          <div className={dotClass}></div>
                          <span className={`text-xs font-bold ${textColor}`}>{displayStatus}</span>
                        </div>
                      </td>
                      <td className="px-md py-md text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => navigate(`/manager/monitoring/${emp._id}`)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-all" title="Monitor">
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card-ai p-xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-md animate-scaleIn">
            <h2 className="text-headline-md font-display-lg text-primary mb-2">Add Personnel</h2>
            <p className="text-on-surface-variant text-sm mb-6">Create a new user account.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Full Name</label>
                <input type="text" className="w-full bg-surface-bright/50 border border-white/10 rounded-xl px-4 py-2 text-on-surface outline-none focus:border-primary/50" value={newEmpData.name} onChange={e => setNewEmpData({...newEmpData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Email</label>
                <input type="email" className="w-full bg-surface-bright/50 border border-white/10 rounded-xl px-4 py-2 text-on-surface outline-none focus:border-primary/50" value={newEmpData.email} onChange={e => setNewEmpData({...newEmpData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Department</label>
                <select className="w-full bg-surface-bright/50 border border-white/10 rounded-xl px-4 py-2 text-on-surface outline-none focus:border-primary/50" value={newEmpData.department} onChange={e => setNewEmpData({...newEmpData, department: e.target.value})}>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-on-surface-variant hover:text-on-surface transition-colors font-bold">Cancel</button>
              <button onClick={handleAddEmployee} disabled={addingEmp} className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold hover:shadow-[0_0_15px_rgba(78,222,163,0.4)] transition-all">
                {addingEmp ? 'Adding...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeList;
