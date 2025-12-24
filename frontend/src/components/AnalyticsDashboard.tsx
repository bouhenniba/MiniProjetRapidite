import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight,
  Search,
  Loader2, Sun, Moon,
  Calendar, AlertCircle, Package,
  Activity, TrendingUp, Layers, Filter, X,
  MapPin, Briefcase, User, Box
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface DataItem {
  [key: string]: any;
}

const AnalyticsDashboard = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [rowsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Advanced State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [groupBy, setGroupBy] = useState<string>('year');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'analytics' | 'raw'>('analytics');

  // High-Power Multi-Criteria Filter State
  const [filters, setFilters] = useState<{
    clie?: string;
    emp?: string;
    prod?: string;
    dept?: string;
  }>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: rowsPerPage.toString(),
        group_by: viewMode === 'analytics' ? groupBy : '',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedYear) params.append('temp', selectedYear);

      // Append Granular Filters
      if (filters.clie) params.append('clie', filters.clie);
      if (filters.emp) params.append('emp', filters.emp);
      if (filters.prod) params.append('prod', filters.prod);
      if (filters.dept) params.append('dept', filters.dept);

      const response = await fetch(`http://localhost:8000/analyse_app/api/analyse/?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      let apiData = result.data || [];

      // Client-side sort if needed
      if (sortColumn) {
        apiData.sort((a: any, b: any) => {
          const aVal = a[sortColumn];
          const bVal = b[sortColumn];
          const multiplier = sortDirection === 'asc' ? 1 : -1;
          if (typeof aVal === 'number') return (aVal - bVal) * multiplier;
          return String(aVal).localeCompare(String(bVal)) * multiplier;
        });
      }

      setData(apiData);
      setTotalRows(result.total_rows || apiData.length);
      const total = result.total_rows || apiData.length;
      setTotalPages(Math.ceil(total / rowsPerPage));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm, sortColumn, sortDirection, rowsPerPage, groupBy, selectedYear, viewMode, filters]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDrillDown = (dataPoint: any) => {
    if (groupBy === 'year' && dataPoint && dataPoint.label) {
      setSelectedYear(dataPoint.label.toString());
      setGroupBy('month');
    }
  };

  // Advanced Filter Logic
  const addFilter = (type: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [type]: value }));
    setCurrentPage(1); // Reset page on filter
  };

  const removeFilter = (type: keyof typeof filters) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedYear('');
    setGroupBy('year');
    setSearchTerm('');
    setFilters({});
    setCurrentPage(1);
  };

  // Column Config State
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    if (data.length > 0 && visibleColumns.length === 0) {
      setVisibleColumns(Object.keys(data[0]));
    }
  }, [data]);

  const handleExport = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleColumn = (col: string) => {
    setVisibleColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-50',
    cardBg: isDarkMode ? 'bg-[#1e293b]' : 'bg-white',
    sidebarBg: isDarkMode ? 'bg-[#1e293b]' : 'bg-white',
    border: isDarkMode ? 'border-slate-700/50' : 'border-slate-200',
    text: isDarkMode ? 'text-slate-100' : 'text-slate-900',
    textSecondary: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    hover: isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100',
    active: isDarkMode ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'bg-blue-50 text-blue-600 font-semibold',
    input: isDarkMode ? 'bg-[#0f172a] border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900',
  };

  return (
    <div className={`flex h-screen ${theme.bg} transition-colors duration-300 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100`}>

      {/* Sidebar */}
      <aside className={`${theme.sidebarBg} border-r ${theme.border} transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-20'} flex flex-col shadow-xl z-20`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <span className={`font-extrabold text-xl ${theme.text} tracking-tight`}>DataVision</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-[0.2em] mb-4 px-3`}>
            {sidebarOpen ? 'Dashboards' : '•••'}
          </div>

          <button
            onClick={() => setViewMode('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${viewMode === 'analytics' ? theme.active : `${theme.text} ${theme.hover}`}`}
          >
            <TrendingUp className={`w-5 h-5 ${viewMode === 'analytics' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
            {sidebarOpen && <span className="font-semibold text-[15px]">Performance</span>}
          </button>

          <button
            onClick={() => setViewMode('raw')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${viewMode === 'raw' ? theme.active : `${theme.text} ${theme.hover}`}`}
          >
            <Layers className={`w-5 h-5 ${viewMode === 'raw' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
            {sidebarOpen && <span className="font-semibold text-[15px]">Data Explorer</span>}
          </button>

          <div className={`mt-10 text-[10px] font-bold ${theme.textSecondary} uppercase tracking-[0.2em] mb-4 px-3`}>
            {sidebarOpen ? 'Analysis Engine' : '•••'}
          </div>

          {viewMode === 'analytics' && (
            <div className="space-y-5 px-3">
              <div className="flex flex-col gap-1.5 px-1">
                {[
                  { id: 'year', label: 'Annual', icon: <Calendar className="w-3.5 h-3.5" /> },
                  { id: 'month', label: 'Monthly', icon: <Activity className="w-3.5 h-3.5" /> },
                  { id: 'department', label: 'Dept', icon: <Briefcase className="w-3.5 h-3.5" /> },
                  { id: 'employee', label: 'Staff', icon: <User className="w-3.5 h-3.5" /> },
                  { id: 'client', label: 'Clients', icon: <MapPin className="w-3.5 h-3.5" /> },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setGroupBy(opt.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${groupBy === opt.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : `${theme.textSecondary} hover:bg-blue-500/5 hover:text-blue-500`}`}
                  >
                    {opt.icon}
                    {sidebarOpen && opt.label}
                  </button>
                ))}
              </div>

              {selectedYear && (
                <div className={`p-4 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Temporal Focus</span>
                    <button onClick={() => setSelectedYear('')} className="text-[10px] font-bold hover:text-red-500 transition-colors uppercase tracking-widest">Clear</button>
                  </div>
                  <div className={`text-sm font-bold ${theme.text}`}>Full Year {selectedYear}</div>
                </div>
              )}

              <button
                onClick={resetFilters}
                className={`w-full py-2.5 mt-4 border ${theme.border} rounded-xl text-[11px] font-bold uppercase tracking-widest ${theme.textSecondary} hover:bg-slate-100 dark:hover:bg-slate-800 transition-all`}
              >
                Reset System View
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700/50">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2.5 rounded-xl ${theme.hover} ${theme.textSecondary} mx-auto block transition-transform active:scale-90`}>
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative flex flex-col bg-inherit">
        {/* Topbar */}
        <header className={`${theme.cardBg} border-b ${theme.border} sticky top-0 z-30 px-8 py-4 flex flex-col gap-4 shadow-sm backdrop-blur-md bg-opacity-80 dark:bg-opacity-80`}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className={`text-xl font-extrabold ${theme.text} tracking-tight`}>
                {viewMode === 'analytics' ? 'Dashboard Insight' : 'Operational Intelligence'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full animate-pulse ${data.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                <span className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-[0.1em]`}>Live Analytics Stream</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative group">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchTerm ? 'text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                <input
                  type="text"
                  placeholder="Universal search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-11 pr-5 py-2.5 rounded-2xl border ${theme.border} ${theme.input} text-[13px] font-medium w-64 md:w-80 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm`}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-2.5 rounded-2xl border ${theme.border} ${theme.cardBg} ${theme.textSecondary} shadow-sm hover:shadow-md transition-all active:scale-95`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(Object.keys(filters).length > 0 || selectedYear) && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className={`p-1.5 rounded-lg bg-blue-500/10 text-blue-500`}>
                <Filter className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedYear && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-blue-500/20">
                    YEAR: {selectedYear}
                    <button onClick={() => setSelectedYear('')} className="hover:bg-white/20 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                )}
                {Object.entries(filters).map(([type, val]) => (
                  <div key={type} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-black uppercase tracking-tighter shadow-lg">
                    {type}: {val}
                    <button onClick={() => removeFilter(type as any)} className="hover:bg-white/20 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button onClick={resetFilters} className={`text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline px-2`}>Clear All</button>
              </div>
            </div>
          )}
        </header>

        <div className="p-8 space-y-8 max-w-[1600px] mx-auto overflow-x-hidden">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {viewMode === 'analytics' ? (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Records', val: totalRows, icon: <Package />, color: 'blue', trend: '+12.5%' },
                  { label: 'Avg Delay', val: `${(data.reduce((acc, curr) => acc + (curr.AVG_RETARD || curr.RETARD || 0), 0) / (data.length || 1) | 0)}d`, icon: <Calendar />, color: 'orange', trend: '-2.1%' },
                  { label: 'Total Duration', val: `${(data.reduce((acc, curr) => acc + (curr.DUREE_REELLE || 0), 0) / 1000).toFixed(1)}k`, icon: <Activity />, color: 'purple', trend: '+5.4%' },
                  { label: 'System Health', val: '99.9%', icon: <Filter />, color: 'emerald', trend: 'Stable' },
                ].map((card, idx) => (
                  <div key={idx} className={`${theme.cardBg} p-6 rounded-3xl border ${theme.border} shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${card.color}-500/5 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-${card.color}-500/10 transition-colors`}></div>
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary}`}>{card.label}</p>
                        <h3 className={`text-2xl font-black ${theme.text} mt-2 tracking-tight`}>{card.val}</h3>
                        <div className={`mt-2 flex items-center gap-1.5`}>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${card.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : card.trend.startsWith('-') ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-500'}`}>
                            {card.trend}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">vs last session</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-2xl bg-${card.color}-500/10 text-${card.color}-600 dark:text-${card.color}-400 group-hover:scale-110 transition-transform shadow-sm`}>
                        {card.icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-6 shadow-sm`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-lg font-bold ${theme.text}`}>Delay Analysis</h3>
                    {groupBy === 'year' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full animate-pulse font-bold tracking-tight">Click bar to drill down</span>}
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data}
                        onClick={(state: any) => {
                          if (state && state.activePayload) {
                            handleDrillDown(state.activePayload[0].payload);
                          }
                        }}
                        style={{ cursor: groupBy === 'year' ? "pointer" : "default" }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#f1f5f9'} vertical={false} />
                        <XAxis dataKey="label" stroke={isDarkMode ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} />
                        <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                        <Tooltip
                          cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }}
                          contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: '12px' }}
                          itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                        />
                        <Bar dataKey="RETARD" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-6 shadow-sm`}>
                  <h3 className={`text-lg font-bold ${theme.text} mb-6`}>Duration Trends</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                        <defs>
                          <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorEst" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#f1f5f9'} vertical={false} />
                        <XAxis dataKey="label" stroke={isDarkMode ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} />
                        <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                        <Tooltip
                          contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: '12px' }}
                        />
                        <Area type="monotone" dataKey="DUREE_REELLE" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorReal)" strokeWidth={2} />
                        <Area type="monotone" dataKey="DUREE_PREVUE" stroke="#10b981" fillOpacity={1} fill="url(#colorEst)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm flex flex-col h-[calc(100vh-12rem)] animate-fade-in`}>
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className={`font-semibold ${theme.text}`}>Detailed Records</h3>
                <div className="flex gap-2">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={() => setShowColumnConfig(!showColumnConfig)}
                      className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest border ${theme.border} rounded-xl ${showColumnConfig ? 'bg-blue-600 text-white border-blue-600' : `${theme.textSecondary} hover:bg-gray-50 dark:hover:bg-slate-800`} transition-all flex items-center gap-2 shadow-sm`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Column Config
                    </button>

                    {showColumnConfig && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowColumnConfig(false)} />
                        <div className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 z-50 p-3 animate-in fade-in zoom-in duration-200 origin-top-right">
                          <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toggle Columns</span>
                            <button
                              onClick={() => setVisibleColumns(Object.keys(data[0]))}
                              className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                            >
                              Reset All
                            </button>
                          </div>
                          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                            {data.length > 0 && Object.keys(data[0]).map(col => (
                              <button
                                key={col}
                                onClick={() => toggleColumn(col)}
                                className={`w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-between ${visibleColumns.includes(col) ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                              >
                                {col.replace(/_/g, ' ')}
                                {visibleColumns.includes(col) && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleExport}
                    className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 active:scale-95`}
                  >
                    Generate CSV Report
                  </button>
                </div>
              </div>

              {/* Table Container - Flex grow for scrolling */}
              <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead className={`bg-gray-50/95 dark:bg-[#0f172a]/95 backdrop-blur z-40 sticky top-0 font-medium ${theme.textSecondary}`}>
                    <tr>
                      {data.length > 0 && Object.keys(data[0]).filter(k => visibleColumns.includes(k)).map((key) => (
                        <th key={key} className="px-6 py-4 whitespace-nowrap border-b border-gray-200 dark:border-slate-700 first:pl-10 last:pr-10">
                          <button onClick={() => handleSort(key)} className="flex items-center gap-1 hover:text-blue-500 transition-colors uppercase text-[10px] tracking-[0.1em] font-black">
                            {key.replace(/_/g, ' ')}
                            {sortColumn === key && (sortDirection === 'asc' ? <span className="text-blue-500">↑</span> : <span className="text-blue-500">↓</span>)}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.border}`}>
                    {loading ? (
                      <tr><td colSpan={10} className="py-20 text-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" /></td></tr>
                    ) : (
                      data.map((row, i) => (
                        <tr key={i} className={`${theme.hover} transition-colors group`}>
                          {Object.entries(row).filter(([k]) => visibleColumns.includes(k)).map(([key, value], j) => {
                            let content = value;

                            // Conditional Formatting
                            if (key === 'RETARD') {
                              const val = Number(value);
                              content = val > 0 ? (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter bg-rose-600 text-white dark:bg-rose-500/90 shadow-[0_2px_8px_rgba(225,29,72,0.4)] transition-transform group-hover:scale-105">
                                  {val}D DELAY
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter bg-emerald-600 text-white dark:bg-emerald-500/90 shadow-[0_2px_8px_rgba(16,185,129,0.4)] transition-transform group-hover:scale-105">
                                  ON TIME
                                </span>
                              );
                            } else if (key.includes('DUREE')) {
                              content = <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">{value}<span className="text-[9px] ml-1">HR</span></span>;
                            } else if (key === 'CLIE_NOM' || key === 'EMP_NOM' || key === 'PROD_NOM' || key === 'EMP_DEPT') {
                              const icon = key === 'CLIE_NOM' ? <MapPin className="w-3 h-3" /> :
                                key === 'EMP_NOM' ? <User className="w-3 h-3" /> :
                                  key === 'PROD_NOM' ? <Box className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />;

                              const filterType = key === 'CLIE_NOM' ? 'clie' :
                                key === 'EMP_NOM' ? 'emp' :
                                  key === 'PROD_NOM' ? 'prod' : 'dept';

                              content = (
                                <button
                                  onClick={() => addFilter(filterType as any, value)}
                                  className="flex flex-col text-left group/cell hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 -m-2 rounded-xl transition-all"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-blue-500 opacity-0 group-hover/cell:opacity-100 transition-opacity translate-x-1 group-hover/cell:translate-x-0">
                                      {icon}
                                    </span>
                                    <span className={`font-extrabold text-[13px] ${theme.text} group-hover/cell:text-blue-600 dark:group-hover/cell:text-blue-400`}>{value}</span>
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4.5">{key.replace('_NOM', '').replace('EMP_', '')}</span>
                                </button>
                              );
                            }

                            return (
                              <td key={j} className={`px-6 py-5 ${theme.text} whitespace-nowrap border-b border-slate-100 dark:border-slate-800/40 first:pl-10 last:pr-10`}>
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between bg-white/5 dark:bg-[#0f172a] shadow-inner rounded-b-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Package className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className={`text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>
                    Showing <span className="text-blue-600 dark:text-blue-400">{Math.min((currentPage - 1) * rowsPerPage + 1, totalRows).toLocaleString()}</span> — <span className="text-blue-600 dark:text-blue-400">{Math.min(currentPage * rowsPerPage, totalRows).toLocaleString()}</span>
                    <span className="mx-2 opacity-30">|</span>
                    Total <span className="text-slate-900 dark:text-slate-100">{totalRows.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 font-black uppercase tracking-widest text-[10px] disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-90 flex items-center gap-2 shadow-sm`}>
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`px-6 py-3 rounded-2xl bg-slate-950 dark:bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] disabled:opacity-30 hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-90 flex items-center gap-2 shadow-lg shadow-blue-500/20`}>
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnalyticsDashboard;