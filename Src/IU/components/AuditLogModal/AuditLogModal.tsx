import React, { useEffect, useState } from 'react';
import { AuditLog } from '../../types';
import { iisService } from '../../services/api';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
);

const FilterIcon = () => (
    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
);

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    target: '',
    limit: 50
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await iisService.getAuditLogs(filters);
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, filters.limit]);

  const handleFilterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      fetchLogs();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Audit Logs</h2>
            <p className="text-xs text-slate-400 font-medium">History of actions performed on the server</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
            <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Action Type</label>
                    <input 
                        type="text" 
                        placeholder="e.g. RestartSite" 
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                        value={filters.action}
                        onChange={e => setFilters(prev => ({...prev, action: e.target.value}))}
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. DefaultAppPool" 
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                        value={filters.target}
                        onChange={e => setFilters(prev => ({...prev, target: e.target.value}))}
                    />
                </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Limit</label>
                    <select 
                        className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                        value={filters.limit}
                        onChange={e => setFilters(prev => ({...prev, limit: Number(e.target.value)}))}
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                    </select>
                </div>
                <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center shadow-sm active:scale-95"
                >
                    <FilterIcon />
                    FILTER
                </button>
            </form>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Time (UTC)</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Action</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Target</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">Client IP</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 w-full">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                     <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 font-medium italic">
                        No audit logs found matching your criteria.
                    </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        log.action.toLowerCase().includes('error') 
                          ? 'bg-red-50 text-red-600 border-red-100' 
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-bold text-slate-700">
                        {log.target}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-400 font-mono">
                        {log.clientIp}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-600 max-w-xs truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:break-words">
                        {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
         <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl text-[10px] text-slate-400 font-medium flex justify-between items-center">
             <span>Showing {logs.length} records</span>
             {logs.length >= filters.limit && <span className="text-amber-500">Limit reached (max {filters.limit})</span>}
         </div>

      </div>
    </div>
  );
};
