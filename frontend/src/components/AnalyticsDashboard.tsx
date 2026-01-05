import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  Filter, Download, Share2, MoreHorizontal, Calendar, Users,
  ArrowUpRight, ArrowDownRight, Clock, AlertCircle, ChevronDown, ChevronUp,
  Layout, Search, Bell, Menu, X, ChevronRight, ChevronLeft,
  Moon, Sun, Activity, Package, TrendingUp, Layers, Box, MapPin, User, Briefcase, Loader2
} from 'lucide-react';

type DimensionLevel =
  | 'ALL' | 'year' | 'saison' | 'month' | 'year+saison' | 'year+month'
  | 'EMPLOYE' | 'DEPARTEMENT' | 'DEPARTEMENT+EMPLOYE'
  | 'produit' | 'categorie' | 'fournisseur' | 'categorie+produit'
  | 'client' | 'pays' | 'pays+client';

type MeasureKey =
  | 'nombre_commandes'
  | 'moyenne_retard'
  | 'total_retard'
  | 'min_retard'
  | 'max_retard'
  | 'moy_prevue'
  | 'moy_reelle'
  | 'ecart_moyen';

const MEASURE_LABELS: Record<MeasureKey, string> = {
  nombre_commandes: 'Orders',
  total_retard: 'Total Delay',
  moyenne_retard: 'Avg Delay',
  min_retard: 'Min Delay',
  max_retard: 'Max Delay',
  moy_prevue: 'Avg Planned',
  moy_reelle: 'Avg Real',
  ecart_moyen: 'Avg Dev'
};

const tableMeasures: MeasureKey[] = [
  'nombre_commandes',
  'total_retard',
  'moyenne_retard',
  'min_retard',
  'max_retard',
  'moy_prevue',
  'moy_reelle',
  'ecart_moyen'
];

// Color Palette for Dark/Light modes
const COLORS = {
  primary: '#3b82f6', // blue-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#f43f5e', // rose-500
  darkBg: '#0f172a', // slate-900
  lightBg: '#f8fafc', // slate-50
  glassLight: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(30, 41, 59, 0.7)'
};

interface OLAPRecord {
  [key: string]: any;
  nombre_commandes: number;
  moyenne_retard: number;
  total_retard: number;
  min_retard: number;
  max_retard: number;
  moy_prevue: number;
  moy_reelle: number;
  ecart_moyen: number;
}

interface DrillPathItem {
  temp: DimensionLevel;
  clie: DimensionLevel;
  emp: DimensionLevel;
  prod: DimensionLevel;
  label: string;

}

interface APIResponse {
  success: boolean;
  data: OLAPRecord[];
  dimensions: {
    temp: string;
    clie: string;
    emp: string;
    prod: string;
  };
  metadata: {
    dimension_count: number;
    record_count: number;
    dimension_columns: string[];
  };
  error?: string;
}

const AnalyticsDashboard = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Advanced State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'analytics' | 'raw'>('analytics');
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(false);

  // OLAP State - Default State set to most detailed as requested
  const [dimensions, setDimensions] = useState({
    temp: 'month' as DimensionLevel,
    clie: 'client' as DimensionLevel,
    emp: 'EMPLOYE' as DimensionLevel,
    prod: 'produit' as DimensionLevel
  });

  const [olapData, setOlapData] = useState<OLAPRecord[]>([]);
  const [selectedMeasure, setSelectedMeasure] = useState<MeasureKey>('moyenne_retard');
  const [drillPath, setDrillPath] = useState<DrillPathItem[]>([]);
  const [dimensionColumns, setDimensionColumns] = useState<string[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Professional Short Label Mapping
  const getDimensionLabel = (slug: string) => {
    if (!slug) return 'Select...';
    const mapping: Record<string, string> = {
      temp: 'Time',
      prod: 'Prod',
      clie: 'Clie',
      emp: 'Staff'
    };
    return mapping[slug] || String(slug).toUpperCase();
  };

  // Derived Data for Display
  const displayedData = olapData
    .filter(item => !searchTerm || Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const totalRows = displayedData.length;
  const data = displayedData;
  const paginatedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const fetchOLAPData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/analyse_app/api/analyse/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dimensions)
      });

      const result: APIResponse = await response.json();

      if (result.success) {
        setOlapData(result.data);
        setDimensionColumns(result.metadata.dimension_columns);
      } else {
        setError(result.error || 'Unknown error');
        console.error('API Error:', result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOLAPData();
  }, [dimensions]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDrillDown = (record: OLAPRecord, dimensionType: 'temp' | 'emp' | 'prod' | 'clie') => {
    const currentLabel = dimensionColumns.map(col => `${col}: ${record[col]}`).join(' | ');

    setDrillPath([...drillPath, {
      ...dimensions,
      label: currentLabel
    }]);

    const newDimensions = { ...dimensions };

    switch (dimensionType) {
      case 'temp':
        if (dimensions.temp === 'year') newDimensions.temp = 'year+month';
        else if (dimensions.temp === 'year+saison') newDimensions.temp = 'year+month';
        else if (dimensions.temp === 'saison') newDimensions.temp = 'year+saison'; // Example inference
        break;
      case 'emp':
        if (dimensions.emp === 'DEPARTEMENT') newDimensions.emp = 'DEPARTEMENT+EMPLOYE';
        break;
      case 'prod':
        if (dimensions.prod === 'categorie') newDimensions.prod = 'categorie+produit';
        // Add more if needed based on "Parallel Hierarchies" (e.g., supplier -> product)?
        // Currently prod hierarchy seems to be simple cat -> prod or supplier -> prod.
        // If user is at supplier, we might want to see products from that supplier.
        if (dimensions.prod === 'fournisseur') newDimensions.prod = 'produit'; // Or custom handling if specific hierarchy exists
        break;
      case 'clie':
        if (dimensions.clie === 'pays') newDimensions.clie = 'pays+client';
        break;
    }

    setDimensions(newDimensions);
  };

  const handleDrillUp = () => {
    if (drillPath.length === 0) return;

    const previous = drillPath[drillPath.length - 1];
    setDimensions({
      temp: previous.temp,
      clie: previous.clie,
      emp: previous.emp,
      prod: previous.prod
    });

    setDrillPath(drillPath.slice(0, -1));
  };

  // Filter handlers (Adapted for new state if needed, or keep for local filtering)
  const addFilter = (type: any, value: string) => {
    // Simplified implementation for now - just logs
    console.log("Filter added:", type, value);
  };
  const removeFilter = (type: any) => { };
  const resetFilters = () => {
    setDimensions({
      temp: 'year',
      clie: 'ALL',
      emp: 'ALL',
      prod: 'ALL'
    });
    setDrillPath([]);
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
    glass: isDarkMode ? 'bg-slate-900/40 backdrop-blur-md border border-slate-700/50' : 'bg-white/40 backdrop-blur-md border border-white/50 shadow-lg',
  };

  // Smart Insight Generator
  const generateInsightText = (rec: OLAPRecord, type: 'good' | 'bad') => {
    const name = rec[dimensionColumns.find(c => c !== 'month' && c !== 'year') || dimensionColumns[0]] || 'Entity';
    if (type === 'bad') return `${name} is causing significant delays (Total: ${rec.total_retard}d).`;
    return `${name} is performing exceptionally well with minimal delay.`;
  };

  // Max value for progress bars
  const maxDelay = Math.max(...olapData.map(d => Number(d.moyenne_retard) || 0), 1);

  // ... existing code ...

  // Decision Support State
  const [showInsights, setShowInsights] = useState(false);

  // Helper to find min/max records
  const getExtremeRecords = (measure: MeasureKey, type: 'min' | 'max', count: number = 3) => {
    if (!olapData.length) return [];
    const sorted = [...olapData].sort((a, b) => {
      const valA = Number(a[measure]) || 0;
      const valB = Number(b[measure]) || 0;
      return type === 'max' ? valB - valA : valA - valB;
    });
    return sorted.slice(0, count);
  };

  // Dynamic Chart Configuration
  const [chartXAxis, setChartXAxis] = useState<string>('');

  useEffect(() => {
    // Auto-select first available dimension for X-Axis if not set
    if (dimensionColumns.length > 0 && !dimensionColumns.includes(chartXAxis)) {
      setChartXAxis(dimensionColumns[0]);
    }
  }, [dimensionColumns]);


  const runQuickAnalysis = (type: 'employee_performance' | 'dept_performance') => {
    resetFilters();
    if (type === 'employee_performance') {
      setDimensions(prev => ({ ...prev, emp: 'EMPLOYE' }));
      setSelectedMeasure('total_retard');
      setSortColumn('total_retard');
      setSortDirection('desc');
    } else if (type === 'dept_performance') {
      setDimensions(prev => ({ ...prev, emp: 'DEPARTEMENT' }));
      setSelectedMeasure('total_retard');
      setSortColumn('total_retard');
      setSortDirection('desc');
    }
    setViewMode('analytics');
  };

  return (
    <div dir="ltr" className={`${isDarkMode ? 'dark' : ''} flex h-screen ${theme.bg} transition-colors duration-300 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100`}>

      {/* Sidebar - RESTORED FOR NAVIGATION ONLY */}
      <aside className={`${theme.sidebarBg} border-r ${theme.border} transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col shadow-xl z-20 shrink-0`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 h-[73px]">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className={`font-extrabold text-xl ${theme.text} tracking-tight`}>DataVision</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-[0.2em] mb-4 px-3`}>
            {sidebarOpen ? 'Navigation' : '•••'}
          </div>

          <button
            onClick={() => setViewMode('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${viewMode === 'analytics' ? theme.active : `${theme.text} ${theme.hover}`}`}
          >
            <TrendingUp className={`w-5 h-5 ${viewMode === 'analytics' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
            {sidebarOpen && <span className="font-semibold text-[14px]">Dashboard</span>}
          </button>

          <button
            onClick={() => setViewMode('raw')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${viewMode === 'raw' ? theme.active : `${theme.text} ${theme.hover}`}`}
          >
            <Layers className={`w-5 h-5 ${viewMode === 'raw' ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
            {sidebarOpen && <span className="font-semibold text-[14px]">Data Explorer</span>}
          </button>

          {/* Decision Support Shortcuts */}
          <div className={`mt-6 text-[10px] font-bold ${theme.textSecondary} uppercase tracking-[0.2em] mb-2 px-3`}>
            {sidebarOpen ? 'Quick Analysis' : '•••'}
          </div>
          <button
            onClick={() => runQuickAnalysis('employee_performance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${theme.text} ${theme.hover}`}
          >
            <User className="w-5 h-5 text-indigo-500" />
            {sidebarOpen && <span className="font-semibold text-[13px]">Employee Delays</span>}
          </button>
          <button
            onClick={() => runQuickAnalysis('dept_performance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${theme.text} ${theme.hover}`}
          >
            <Briefcase className="w-5 h-5 text-purple-500" />
            {sidebarOpen && <span className="font-semibold text-[13px]">Dept. Performance</span>}
          </button>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700/50">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2.5 rounded-xl ${theme.hover} ${theme.textSecondary} mx-auto block transition-transform active:scale-90`}>
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Navbar */}
        <header className={`${theme.cardBg} border-b ${theme.border} h-[73px] flex items-center justify-between px-8 shadow-sm z-10 shrink-0`}>
          <div className="flex flex-col justify-center">
            <h1 className={`text-lg font-extrabold ${theme.text} tracking-tight leading-tight`}>
              {viewMode === 'analytics' ? 'Operational Intelligence' : 'Data Explorer'}
            </h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${data.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
              <span className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-widest`}>Live System</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative group hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                className={`pl-10 pr-4 py-2 rounded-full border ${theme.border} ${theme.input} text-xs font-medium w-64 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
              />
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full ${theme.hover} transition-colors`}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 relative">

          {/* Analysis Context Toolbar (Dimensions) - STICKY & COLLAPSIBLE */}
          <div className={`sticky top-0 z-[100] ${theme.glass} border-b ${theme.border} backdrop-blur-xl transition-all duration-300 ${filterPanelCollapsed ? 'h-12' : 'h-auto'}`}>
            {/* Collapse/Expand Button */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-2">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Filters</span>
                {filterPanelCollapsed && (
                  <span className={`text-[9px] ${theme.textSecondary} ml-2`}>
                    {Object.entries(dimensions).filter(([_, v]) => v !== 'ALL').length} active
                  </span>
                )}
              </div>
              <button
                onClick={() => setFilterPanelCollapsed(!filterPanelCollapsed)}
                className={`p-1.5 rounded-lg ${theme.hover} transition-all hover:scale-110 active:scale-95`}
                title={filterPanelCollapsed ? 'Expand Filters' : 'Collapse Filters'}
              >
                <ChevronDown className={`w-4 h-4 ${theme.text} transition-transform duration-300 ${filterPanelCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Filter Content */}
            <div className={`transition-all duration-300 ${filterPanelCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>
              <div className="flex flex-col lg:flex-row items-center gap-4 px-6 lg:px-10 pb-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full relative">
                  {/* Backdrop for closing dropdowns */}
                  {openDropdown && (
                    <div className="fixed inset-0 z-[60]" onClick={() => setOpenDropdown(null)}></div>
                  )}
                  {[
                    { key: 'temp', val: dimensions.temp, set: (v: any) => setDimensions({ ...dimensions, temp: v }), opts: [['ALL', 'All Time'], ['year', 'Year'], ['saison', 'Season'], ['month', 'Month'], ['year+saison', 'Year & Season'], ['year+month', 'Year & Month']], label: 'Time', icon: Calendar },
                    { key: 'emp', val: dimensions.emp, set: (v: any) => setDimensions({ ...dimensions, emp: v }), opts: [['ALL', 'All Staff'], ['EMPLOYE', 'Employee'], ['DEPARTEMENT', 'Department'], ['DEPARTEMENT+EMPLOYE', 'Dept & Emp']], label: 'Staff', icon: User },
                    { key: 'prod', val: dimensions.prod, set: (v: any) => setDimensions({ ...dimensions, prod: v }), opts: [['ALL', 'All Products'], ['produit', 'Product'], ['categorie', 'Category'], ['fournisseur', 'Supplier'], ['categorie+produit', 'Cat & Prod']], label: 'Product', icon: Box },
                    { key: 'clie', val: dimensions.clie, set: (v: any) => setDimensions({ ...dimensions, clie: v }), opts: [['ALL', 'All Clients'], ['client', 'Client'], ['pays', 'Country'], ['pays+client', 'Country & Client']], label: 'Client', icon: MapPin }
                  ].map((dim, idx) => (
                    <div key={idx} className="relative group z-[70]">
                      <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-0 group-hover:opacity-30 transition duration-500 blur-sm`}></div>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === dim.key ? null : dim.key)}
                          className={`w-full flex items-center justify-between ${isDarkMode ? 'bg-[#1e293b] text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'} border rounded-full pl-10 pr-4 py-3 text-xs font-bold transition-all shadow-sm hover:shadow-md outline-none hover:scale-[1.02] active:scale-[0.98]`}
                        >
                          <span className="truncate">{dim.opts.find(o => o[0] === dim.val)?.[1] || dim.val}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${openDropdown === dim.key ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                        </button>

                        <dim.icon className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} pointer-events-none`} />
                        <span className={`absolute -top-2.5 left-4 px-2 text-[9px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'bg-[#1e293b] text-blue-300' : 'bg-white text-blue-600'} rounded-full shadow-sm border ${isDarkMode ? 'border-slate-600' : 'border-slate-100'} scale-90`}>{dim.label}</span>

                        {/* Custom Dropdown Menu */}
                        {openDropdown === dim.key && (
                          <div className={`absolute top-full left-0 mt-2 w-full min-w-[200px] rounded-2xl border ${theme.border} ${isDarkMode ? 'bg-[#0f172a]/95' : 'bg-white/95'} backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[110]`}>
                            <div className="max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent p-2">
                              {dim.opts.map(([k, v]) => (
                                <button
                                  key={k}
                                  onClick={() => { dim.set(k); setOpenDropdown(null); }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all mb-1 last:mb-0 ${dim.val === k ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' : `${theme.text} hover:bg-slate-100 dark:hover:bg-slate-800`}`}
                                >
                                  <span>{v}</span>
                                  {dim.val === k && <span className="text-white font-bold select-none">✓</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4 lg:ml-2">
                  <button onClick={resetFilters} className={`p-2.5 rounded-xl ${theme.hover} text-rose-500 transition-colors`} title="Reset"><X className="w-4 h-4" /></button>
                  <button onClick={fetchOLAPData} className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all"><Activity className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Active Filter Chips Display */}
              {(Object.values(dimensions).some(d => d !== 'ALL') || drillPath.length > 0) && (
                <div className={`px-4 py-2 ${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'} border-t ${theme.border} flex items-center gap-3 overflow-x-auto rounded-b-2xl`}>
                  {drillPath.length > 0 && (
                    <div className="flex items-center gap-1.5 mr-4 border-r pr-4 border-slate-200 dark:border-slate-700">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Path:</span>
                      {drillPath.map((step, i) => (
                        <span key={i} className="text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 shadow-sm">{step.label}</span>
                      ))}
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>
                  )}
                  {Object.entries(dimensions).filter(([k, v]) => v !== 'ALL' && k !== 'temp').map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-bold uppercase shadow-md">
                      <span>{k}: {v}</span>
                      <button onClick={() => setDimensions({ ...dimensions, [k]: 'ALL' })} className="hover:text-rose-300"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-6 lg:p-10 space-y-8">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {/* KPIs */}
            {viewMode === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Total Volume', val: totalRows, icon: Package, color: 'blue' },
                  { label: 'Avg Delay', val: `${(data.reduce((acc, curr) => acc + (Number(curr.moyenne_retard) || 0), 0) / (data.length || 1)).toFixed(1)}d`, icon: Calendar, color: 'indigo' },
                  { label: 'Throughput', val: '94%', icon: Activity, color: 'emerald' },
                  { label: 'Efficiency', val: 'High', icon: TrendingUp, color: 'violet' },
                ].map((kpi, i) => (
                  <div key={i} className={`${theme.cardBg} border ${theme.border} border-b-4 border-b-${kpi.color}-500 p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 group lg:hover:-translate-y-1 relative overflow-hidden`}>
                    {/* Professional Watermark: Faint, large, rotated icon stroke without background block */}
                    <div className={`absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12`}>
                      <kpi.icon className={`w-32 h-32 text-${kpi.color}-500`} strokeWidth={1} />
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary}`}>{kpi.label}</p>
                        <h3 className={`text-2xl font-black mt-1 ${theme.text}`}>{kpi.val}</h3>
                      </div>
                      <div className={`p-2.5 rounded-xl bg-${kpi.color}-500/10 text-${kpi.color}-600 group-hover:scale-110 transition-transform shadow-sm`}>
                        <kpi.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Decision Support / Insights Panel (Only when relevant dimensions are selected) */}
            {viewMode === 'analytics' && (dimensions.emp !== 'ALL' || dimensions.clie !== 'ALL' || dimensions.prod !== 'ALL') && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${theme.glass} p-6 rounded-2xl shadow-lg border border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden group`}>
                  {/* Abstract Decorative Elements for Executive Look */}
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <div className="w-32 h-32 rounded-full border-[16px] border-emerald-500/20 blur-xl"></div>
                  </div>
                  <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-3xl"></div>

                  <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary} mb-6 flex items-center gap-2 relative z-10`}>
                    <span className="p-1 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"><TrendingUp className="w-3 h-3" /></span>
                    Top Performers
                  </h3>
                  <div className="space-y-3 relative z-10">
                    {getExtremeRecords('total_retard', 'min').map((rec, i) => (
                      <div key={i} className={`flex flex-col p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-white/60 hover:bg-white/80'} backdrop-blur-sm border ${isDarkMode ? 'border-slate-700/50' : 'border-emerald-50'} hover:border-emerald-300 transition-all duration-300 shadow-sm hover:shadow-md cursor-default`}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{rec[dimensionColumns.find(c => c !== 'month' && c !== 'year') || dimensionColumns[0]] || 'Unknown'}</span>
                          <span className={`text-sm font-mono font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{rec.total_retard}d</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-relaxed font-medium">{generateInsightText(rec, 'good')}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${theme.glass} p-6 rounded-2xl shadow-lg border border-rose-100 dark:border-rose-900/30 relative overflow-hidden group`}>
                  {/* Abstract Decorative Elements for Executive Look */}
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <div className="w-32 h-32 rounded-full border-[16px] border-rose-500/20 blur-xl border-dashed"></div>
                  </div>
                  <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-gradient-to-tr from-rose-500/10 to-transparent rounded-full blur-3xl"></div>

                  <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary} mb-6 flex items-center gap-2 relative z-10`}>
                    <div className="relative p-1 rounded bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                      <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                      <AlertCircle className="w-3 h-3 relative" />
                    </div>
                    Critical Attention
                  </h3>
                  <div className="space-y-3 relative z-10">
                    {getExtremeRecords('total_retard', 'max').map((rec, i) => (
                      <div key={i} className={`flex flex-col p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-white/60 hover:bg-white/80'} backdrop-blur-sm border-l-[3px] border-l-rose-500 border-y border-r border-slate-100 dark:border-slate-700/50 hover:border-r-rose-200 transition-all duration-300 shadow-sm hover:shadow-md cursor-default`}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{rec[dimensionColumns.find(c => c !== 'month' && c !== 'year') || dimensionColumns[0]] || 'Unknown'}</span>
                          <span className={`text-sm font-mono font-extrabold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>{rec.total_retard}d</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-relaxed font-medium">{generateInsightText(rec, 'bad')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Charts Section - ONLY IN ANALYTICS MODE */}
            {viewMode === 'analytics' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className={`text-lg font-bold ${theme.text}`}>Performance Visualization</h2>
                  <div className="flex gap-2 items-center">
                    {/* Dynamic Axes Selectors */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <span className="text-[9px] font-bold uppercase px-2 text-slate-500">X-Axis:</span>
                      <select
                        value={chartXAxis}
                        onChange={(e) => setChartXAxis(e.target.value)}
                        className={`text-xs font-bold outline-none cursor-pointer hover:text-blue-500 transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'} py-1 pl-1 pr-2 rounded`}
                      >
                        {dimensionColumns.map(col => <option key={col} value={col} className={isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}>{col}</option>)}
                      </select>
                    </div>

                    <select
                      value={selectedMeasure}
                      onChange={(e) => setSelectedMeasure(e.target.value as MeasureKey)}
                      className={`px-4 py-2 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#1e293b] text-slate-100' : 'bg-white text-slate-800'} text-xs font-bold uppercase shadow-sm outline-none cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
                    >
                      {Object.keys(MEASURE_LABELS).map((m) => (
                        <option key={m} value={m}>{MEASURE_LABELS[m as MeasureKey]}</option>
                      ))}
                    </select>
                    {drillPath.length > 0 && <button onClick={handleDrillUp} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900 dark:text-blue-400"><ChevronUp className="w-4 h-4" /></button>}
                  </div>
                </div>

                {/* Planned vs Real Duration Comparison */}
                <div className={`w-full ${theme.cardBg} border ${theme.border} rounded-2xl p-5 shadow-sm`}>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary} mb-4`}>Planned vs. Real Duration</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={olapData.slice(0, 30)} margin={{ top: 10, right: 10, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                        <XAxis
                          dataKey={chartXAxis || dimensionColumns[0]}
                          stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                          fontSize={10}
                          tickMargin={10}
                          label={{ value: `Dimension: ${getDimensionLabel(chartXAxis || dimensionColumns[0])}`, position: 'insideBottom', offset: -25, fontSize: 10, fontWeight: '800', fill: isDarkMode ? '#94a3b8' : '#1e293b', opacity: 0.5 }}
                        />
                        <YAxis
                          stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                          fontSize={10}
                          label={{ value: 'Duration (Days)', angle: -90, position: 'insideLeft', offset: -30, fontSize: 10, fontWeight: '800', fill: isDarkMode ? '#94a3b8' : '#1e293b', opacity: 0.5 }}
                        />
                        <Tooltip
                          cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#1e293b' : '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="moy_prevue" name="Planned Duration" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="moy_reelle" name="Real Duration" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                  <div className={`lg:col-span-2 ${theme.cardBg} border ${theme.border} rounded-2xl p-5 shadow-sm`}>
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary} mb-4`}>Main Analysis</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={olapData.slice(0, 25)} onClick={(s) => s?.activePayload && handleDrillDown(s.activePayload[0].payload, 'temp')} style={{ cursor: 'pointer' }} margin={{ top: 10, right: 10, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                        <XAxis
                          dataKey={chartXAxis || dimensionColumns[0]}
                          stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                          fontSize={10}
                          tickMargin={10}
                          label={{ value: `Dimension: ${getDimensionLabel(chartXAxis || dimensionColumns[0])}`, position: 'insideBottom', offset: -25, fontSize: 10, fontWeight: '800', fill: isDarkMode ? '#94a3b8' : '#1e293b', opacity: 0.5 }}
                        />
                        <YAxis
                          stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                          fontSize={10}
                          label={{ value: MEASURE_LABELS[selectedMeasure], angle: -90, position: 'insideLeft', offset: -30, fontSize: 10, fontWeight: '800', fill: isDarkMode ? '#94a3b8' : '#1e293b', opacity: 0.5 }}
                        />
                        <Tooltip cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }} contentStyle={{ borderRadius: '12px', borderColor: 'transparent', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                        <Bar dataKey={selectedMeasure} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-5 shadow-sm`}>
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary} mb-4`}>Duration Trends</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={olapData.slice(0, 25)}>
                        <defs>
                          <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                        <XAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Area type="monotone" dataKey="moy_reelle" stroke="#8b5cf6" fill="url(#colorR)" />
                        <Area type="monotone" dataKey="moy_prevue" stroke="#10b981" fill="transparent" strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Data Table Section - ONLY IN RAW MODE */}
            {viewMode === 'raw' && (
              <div className={`mt-8 ${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden min-h-[500px] flex flex-col`}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><Layers className="w-4 h-4 text-blue-600" /></div>
                    <div>
                      <h3 className={`font-bold text-sm ${theme.text}`}>Detailed Records</h3>
                      <p className={`text-[10px] ${theme.textSecondary} flex items-center gap-1`}>
                        {olapData.filter(item => !searchTerm || Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))).length} records found
                        {(searchTerm || sortColumn) && <span className="text-blue-500">(Filtered/Sorted)</span>}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleExport} className="text-[11px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors">Export CSV</button>
                </div>

                <div
                  className="flex-1 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative min-h-[400px]"
                >
                  {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-20 flex items-center justify-center rounded-2xl transition-all duration-300">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Synchronizing Data...</span>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-center text-sm whitespace-nowrap">
                    <thead className={`${isDarkMode ? 'bg-slate-800/80' : 'bg-gray-50/80'} ${theme.textSecondary} backdrop-blur-sm sticky top-0 z-30`}>
                      <tr>
                        {/* Individual Dimension Headers */}
                        {dimensionColumns.map((col) => (
                          <th
                            key={col}
                            className={`
                              px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-center cursor-pointer transition-all 
                              border-r border-b-2 border-slate-200 dark:border-slate-700/60
                              ${isDarkMode ? 'bg-slate-800/90 text-blue-300' : 'bg-slate-50/80 text-blue-700'}
                              hover:bg-slate-100 dark:hover:bg-slate-700
                              ${sortColumn === col ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''}
                              min-w-[150px]
                            `}
                            onClick={() => handleSort(col)}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <span>{getDimensionLabel(col)}</span>
                              {sortColumn === col && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                          </th>
                        ))}

                        {/* Sharp Grid Measure Headers */}
                        {tableMeasures.map(m => (
                          <th
                            key={m}
                            className={`
                              px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-center cursor-pointer transition-all 
                              border-r border-b-2 border-slate-200 dark:border-slate-700/60
                              ${theme.text} hover:bg-slate-100 dark:hover:bg-slate-700
                              ${sortColumn === m ? (isDarkMode ? 'bg-emerald-900/40' : 'bg-emerald-100/50') : ''}
                              min-w-[100px]
                            `}
                            onClick={() => handleSort(m)}
                          >
                            {MEASURE_LABELS[m]} {sortColumn === m && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                        ))}
                        <th className={`px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700/60 font-bold text-[10px] uppercase tracking-widest text-center ${theme.text}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-100 dark:divide-slate-700/50 transition-all duration-300 ${loading ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}>
                      {paginatedData.map((row, i) => (
                        <tr
                          key={i}
                          onMouseEnter={() => setHoveredRow(i)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className={`
                            group transition-all duration-300 border-b border-slate-100 dark:border-slate-800/40
                            ${isDarkMode ? 'hover:bg-slate-800/80 even:bg-slate-800/20' : 'hover:bg-blue-50/50 even:bg-slate-50/30'}
                            relative
                          `}
                        >
                          {/* Individual Dimension Data Cells */}
                          {dimensionColumns.map((col) => (
                            <td
                              key={col}
                              className={`
                                px-4 py-3 text-center text-[12px] font-bold tracking-tight
                                border-r border-b border-slate-100 dark:border-slate-800/40
                                ${isDarkMode ? 'text-slate-100 bg-slate-900/30' : 'text-slate-900 bg-white'}
                                transition-all duration-200
                                ${hoveredRow === i ? (isDarkMode ? 'bg-slate-800/60' : 'bg-blue-50/40') : ''}
                              `}
                            >
                              {String(row[col])}
                            </td>
                          ))}

                          {/* Sharp Measure Cells */}
                          {tableMeasures.map(m => (
                            <td
                              key={m}
                              className={`
                                px-4 py-2 tabular-nums font-bold text-[12px] text-center 
                                border-r border-b border-slate-100 dark:border-slate-800/40
                                ${theme.text} 
                                ${sortColumn === m ? (isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50/30') : ''}
                                ${m === 'moyenne_retard' ? 'min-w-[150px]' : ''}
                              `}
                            >
                              {m === 'moyenne_retard' ? (
                                <div className="flex items-center gap-3">
                                  <span className={`text-[11px] font-black min-w-[35px] text-right ${theme.text}`}>{Number(row[m]).toFixed(1)}d</span>
                                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${row[m] > 5 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                      style={{ width: `${Math.min((row[m] / maxDelay) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ) : (
                                Number.isFinite(Number(row[m])) ? (m.includes('moy') || m.includes('ecart') ? Number(row[m]).toFixed(1) : row[m]) : row[m]
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-center border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/10 dark:bg-slate-800/10">
                            <button
                              onClick={() => handleDrillDown(row, 'temp')}
                              className="p-1 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all active:scale-95 text-[10px] font-black uppercase"
                            >
                              Drill
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center mt-auto">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSecondary}`}>
                    Page {currentPage} of {totalPages} ({totalRows} records found)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`p-2.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm hover:shadow-md`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className={`p-2.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm hover:shadow-md`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </main>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;