
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { iisService } from './services/api';
import { IisSite, AppPool } from './types';
import { StatusBadge } from './components/StatusBadge';
import { Toast } from './components/Toast';
import { AuditLogModal } from './components/AuditLogModal/AuditLogModal';

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);
const PowerIcon = () => (
  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);
const RecycleIcon = ({ className }: { className?: string }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);
const ServerIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
);
const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={`w-3 h-3 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
);
const UserIcon = () => (
  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const ClockIcon = () => (
    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const REFRESH_INTERVAL = 30;

const App: React.FC = () => {
  const [sites, setSites] = useState<IisSite[]>([]);
  const [pools, setPools] = useState<AppPool[]>([]);
  const [filter, setFilter] = useState('');
  const [poolFilter, setPoolFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeLeft, setTimeLeft] = useState(REFRESH_INTERVAL);
  
  const filterRef = useRef(filter);
  const poolFilterRef = useRef(poolFilter);
  useEffect(() => { filterRef.current = filter; }, [filter]);
  useEffect(() => { poolFilterRef.current = poolFilter; }, [poolFilter]);

  const fetchTopology = useCallback(async (siteSearch?: string, poolSearch?: string) => {
    setLoading(true);
    try {
      const [sitesData, poolsData] = await Promise.all([
        iisService.getTopology(siteSearch),
        iisService.getPools(poolSearch)
      ]);
      
      setSites(sitesData);
      setPools(poolsData);
      setTimeLeft(REFRESH_INTERVAL);
    } catch (err: any) {
      setToast({ message: err.message || 'Error fetching IIS status', type: 'error' });
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('webcontainer')) {
        setSites([{ id: 6, name: 'SacNet-rc', state: 'Started', applications: [{ path: '/', poolName: 'SacNet-rc' }] }]);
        setPools([{ name: 'SacNet-rc', state: 'Started', managedRuntimeVersion: 'v4.0', pipelineMode: 'Integrated', identity: 'ApplicationPoolIdentity', applicationCount: 1 }]);
        setTimeLeft(REFRESH_INTERVAL);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchTopology(filterRef.current, poolFilterRef.current);
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchTopology]);

  useEffect(() => { fetchTopology(); }, [fetchTopology]);

  const handleRestartSite = async (name: string) => {
    setActionLoading(`site-${name}`);
    try {
      await iisService.restartSite(name);
      setToast({ message: `Site '${name}' restarted`, type: 'success' });
      await fetchTopology(filter, poolFilter);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally { setActionLoading(null); }
  };

  const handleRecyclePool = async (name: string) => {
    setActionLoading(`pool-${name}`);
    try {
      await iisService.recyclePool(name);
      setToast({ message: `Pool '${name}' recycled`, type: 'success' });
      await fetchTopology(filter, poolFilter);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally { setActionLoading(null); }
  };

  const toggleSiteExpand = (name: string) => {
    setExpandedSites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const expandAll = () => setExpandedSites(new Set(sites.map(s => s.name)));
  const collapseAll = () => setExpandedSites(new Set());

  const filteredPoolsList = useMemo(() => {
    if (!poolFilter.trim()) return pools;
    const lower = poolFilter.toLowerCase();
    return pools.filter(p => p.name.toLowerCase().includes(lower));
  }, [pools, poolFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm px-4">
        <div className="max-w-[1440px] mx-auto h-16 flex items-center justify-between gap-6">
          {/* Brand/Logo */}
          <div className="flex items-center space-x-3 shrink-0 py-1.5 px-3 border border-blue-100 rounded-xl bg-blue-50/30">
            <ServerIcon />
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-800 leading-none">IIS Manager Dashboard</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">ACTSIS INFRASTRUCTURE</p>
            </div>
          </div>

          {/* Search - Centered */}
          <div className="flex-1 max-w-xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); fetchTopology(filter, poolFilter); }} className="w-full flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                   <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Filter by site name..."
                  className="block w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => fetchTopology(filter, poolFilter)}
                disabled={loading}
                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg bg-white border border-slate-200 shadow-sm transition-colors"
              >
                <RefreshIcon className={loading ? 'animate-spin' : ''} />
              </button>
            </form>
          </div>

          {/* Controls - Right */}
          <div className="flex items-center space-x-3 shrink-0">
             <button
                onClick={() => setShowAuditLogs(true)}
                className="flex items-center px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
             >
                <ClockIcon />
                AUDIT LOGS
             </button>

             <div className="flex items-center space-x-2 bg-slate-100/80 px-4 py-1.5 rounded-full border border-slate-200">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="sr-only peer" />
                  <div className="w-7 h-4 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-3"></div>
                  <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">AUTO-SYNC</span>
                </label>
                {autoRefresh && <span className="text-[10px] font-mono text-blue-600 font-bold w-6 tabular-nums text-center">{timeLeft}s</span>}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sites Section */}
          <section className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 px-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center">
                  SITES
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-blue-600/10 text-blue-600 rounded-md tabular-nums">{sites.length}</span>
                </h2>
                <div className="h-4 w-px bg-slate-200 mx-2"></div>
                <div className="flex items-center gap-1">
                   <button onClick={expandAll} className="px-2 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-200 rounded transition-colors uppercase">Expand All</button>
                   <button onClick={collapseAll} className="px-2 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-200 rounded transition-colors uppercase">Collapse All</button>
                </div>
              </div>
            </div>
            
            {sites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sites.map((site) => {
                  const isExpanded = expandedSites.has(site.name);
                  const hasManyApps = site.applications.length > 3;
                  const visibleApps = isExpanded ? site.applications : site.applications.slice(0, 3);

                  return (
                    <div key={site.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group/card">
                      <div className="p-4 border-b border-slate-100 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm truncate" title={site.name}>{site.name}</h3>
                            <div className="flex items-center mt-1.5 space-x-2">
                               <StatusBadge status={site.state} />
                               <span className="text-[9px] font-bold text-slate-300 tracking-wider">ID: {site.id}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRestartSite(site.name)}
                            disabled={actionLoading === `site-${site.name}`}
                            className="flex items-center px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm shrink-0 transition-transform active:scale-95 disabled:opacity-50"
                          >
                            {actionLoading === `site-${site.name}` ? <RefreshIcon className="animate-spin mr-1" /> : <PowerIcon />}
                            RESTART
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50/40 p-4 flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">APPLICATIONS ({site.applications.length})</p>
                        
                        <div className="space-y-2">
                          {visibleApps.map((app, idx) => {
                            const isPoolLoading = actionLoading === `pool-${app.poolName}`;
                            return (
                              <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] group/app transition-all hover:border-blue-300/50">
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="font-mono text-[11px] text-blue-700 font-bold truncate leading-tight">{app.path}</span>
                                  <span className="text-[9px] text-slate-400 font-bold truncate flex items-center mt-1 uppercase tracking-tight">
                                    <span className="w-1 h-1 bg-slate-300 rounded-full mr-1.5 shrink-0"></span>
                                    {app.poolName}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleRecyclePool(app.poolName)}
                                  disabled={isPoolLoading}
                                  title={`Recycle Pool: ${app.poolName}`}
                                  className={`p-1.5 rounded-lg transition-all shrink-0 ${
                                    isPoolLoading 
                                    ? 'bg-indigo-50 text-indigo-600' 
                                    : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover/app:opacity-100 group-hover/card:opacity-100 focus:opacity-100'
                                  }`}
                                >
                                  {isPoolLoading ? <RefreshIcon className="animate-spin" /> : <RecycleIcon />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        
                        {hasManyApps && (
                          <button 
                            onClick={() => toggleSiteExpand(site.name)}
                            className="w-full mt-3 py-1.5 text-[9px] font-bold text-slate-400 hover:text-blue-600 hover:bg-white bg-slate-100/50 border border-slate-200 rounded-lg transition-all flex items-center justify-center gap-1 uppercase tracking-widest"
                          >
                            {isExpanded ? 'Show less' : `Show ${site.applications.length - 3} more`}
                            <ChevronDown className={isExpanded ? 'rotate-180' : ''} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              !loading && (
                <div className="py-20 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                  <ServerIcon />
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest">No matching sites found.</p>
                </div>
              )
            )}
          </section>

          {/* App Pools Section (Sidebar) */}
          <section className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 px-1">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center">
                APP POOLS
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600/10 text-indigo-600 rounded-md tabular-nums">{pools.length}</span>
              </h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-100">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search pools..."
                    className="block w-full pl-8 pr-3 py-2 text-[11px] border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    value={poolFilter}
                    onChange={(e) => setPoolFilter(e.target.value)}
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto custom-scrollbar">
                {filteredPoolsList.length > 0 ? (
                  filteredPoolsList.map((pool) => (
                    <div key={pool.name} className="p-4 hover:bg-slate-50 transition-colors flex flex-col space-y-3 group">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                             <h3 className="text-[11px] font-bold text-slate-800 truncate" title={pool.name}>{pool.name}</h3>
                             <StatusBadge status={pool.state} />
                          </div>
                          <div className="mt-2 flex items-center text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            <UserIcon />
                            <span className="truncate max-w-[140px]">{pool.identity}</span>
                            <span className="mx-2 text-slate-200 font-normal">|</span>
                            <span className="text-indigo-500">{pool.applicationCount} APPS</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRecyclePool(pool.name)}
                          disabled={actionLoading === `pool-${pool.name}`}
                          className="flex items-center px-2 py-1.5 text-[9px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm transition-all shrink-0 ml-3 disabled:opacity-50"
                        >
                          {actionLoading === `pool-${pool.name}` ? <RefreshIcon className="animate-spin" /> : <RecycleIcon />}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">
                    No matching pools found.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {loading && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-t-blue-600 animate-spin"></div>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Syncing Infrastructure</p>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AuditLogModal isOpen={showAuditLogs} onClose={() => setShowAuditLogs(false)} />

      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-auto">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div>ACTSIS SOPORTE INTERNO &bull; {new Date().getFullYear()}</div>
          <div className="hidden sm:flex items-center space-x-6">
            <a href="mailto:soporte@actsis.com" className="hover:text-blue-600 transition-colors">REPORT ISSUE</a>
            <span className="text-slate-200">|</span>
            <div className="flex items-center space-x-2 text-green-600/70">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span>INFRASTRUCTURE API CONNECTION STABLE</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
