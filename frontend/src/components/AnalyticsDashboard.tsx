import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  Filter, Calendar, ChevronDown, ChevronUp,
  Search, X, ChevronRight, ChevronLeft,
  Moon, Sun, Activity, Package, TrendingUp, Layers, Box, MapPin, User, Briefcase, Loader2,
  Maximize2, Minimize2, ArrowUp, ArrowDown, AlertCircle
} from 'lucide-react';

type DimensionLevel =
  | 'ALL' | 'year' | 'saison' | 'month' | 'year+saison' | 'year+month'
  | 'EMPLOYE' | 'DEPARTEMENT' | 'DEPARTEMENT+EMPLOYE'
  | 'produit' | 'categorie' | 'fournisseur' | 'categorie+produit' | 'fournisseur+produit'
  | 'categorie+produit+fournisseur'
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

const HIERARCHIES: Record<string, DimensionLevel[]> = {
  temp: ['ALL', 'year', 'year+saison', 'year+month'],
  emp: ['ALL', 'DEPARTEMENT', 'DEPARTEMENT+EMPLOYE'],
  clie: ['ALL', 'pays', 'pays+client']
};

const COLUMN_TO_DIMENSION: Record<string, string> = {
  year: 'temp', saison: 'temp', month: 'temp', 'year+saison': 'temp', 'year+month': 'temp',
  DEPARTEMENT: 'emp', EMPLOYE: 'emp', 'DEPARTEMENT+EMPLOYE': 'emp',
  categorie: 'prod', produit: 'prod', fournisseur: 'prod', 'categorie+produit': 'prod', 'fournisseur+produit': 'prod', 'categorie+produit+fournisseur': 'prod',
  pays: 'clie', client: 'clie', 'pays+client': 'clie'
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
    temp: 'year+month' as DimensionLevel,
    clie: 'pays+client' as DimensionLevel,
    emp: 'DEPARTEMENT+EMPLOYE' as DimensionLevel,
    prod: 'categorie+produit+fournisseur' as DimensionLevel
  });

  const [olapData, setOlapData] = useState<OLAPRecord[]>([]);
  const [selectedMeasure, setSelectedMeasure] = useState<MeasureKey>('moyenne_retard');
  const [drillPath, setDrillPath] = useState<DrillPathItem[]>([]);
  const [dimensionColumns, setDimensionColumns] = useState<string[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showSlicer, setShowSlicer] = useState<{ cols: string[], activeCol: string, x: number, y: number } | null>(null);
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [showProdDrillMenu, setShowProdDrillMenu] = useState<{ x: number, y: number } | null>(null);

  // Professional Short Label Mapping
  // Professional Short Label Mapping
  const resolveColumn = (colName: string, keys: string[]) => {
    if (!colName) return '';
    const norm = colName.toLowerCase();
    // 1. Exact match
    let match = keys.find(k => k.toLowerCase() === norm);
    if (match) return match;
    // 2. Fuzzy match (contains) - vital for 'year' vs 'dim_year' vs 'annee'
    const aliases: Record<string, string[]> = {
      year: ['annee', 'year', 'yr', 'an', 'date_id'],
      month: ['mois', 'month', 'mon', 'month_id'],
      saison: ['season', 'sais', 'trimestre'],
      week: ['semaine'], day: ['jour'],
      client: ['cli_nom', 'customer'], product: ['produit', 'libelle_produit'], country: ['pays']
    };
    if (aliases[norm]) {
      match = keys.find(k => {
        const lowerK = k.toLowerCase();
        return aliases[norm].some(a => lowerK === a || lowerK.includes(a));
      });
      if (match) return match;
    }
    // 3. Last fallback: look for partial inclusion
    match = keys.find(k => k.toLowerCase().includes(norm));
    if (match) return match;

    return colName;
  };

  const getDimensionLabel = (slug: string) => {
    if (!slug) return 'Select...';
    // Specific Column Mappings (Lowercase input expected)
    const s = String(slug).toLowerCase();
    const specificMapping: Record<string, string> = {
      'year': 'Year', 'annee': 'Year',
      'month': 'Month', 'mois': 'Month',
      'saison': 'Season',
      'categorie': 'Category', 'produit': 'Product', 'fournisseur': 'Supplier',
      'client': 'Client', 'pays': 'Country',
      'employe': 'Employee', 'departement': 'Department',
      'all': 'All'
    };

    if (specificMapping[s]) return specificMapping[s];
    if (specificMapping[slug]) return specificMapping[slug];

    const dimKey = COLUMN_TO_DIMENSION[slug];
    const mapping: Record<string, string> = {
      temp: 'Time',
      prod: 'Product',
      clie: 'Client',
      emp: 'Staff'
    };
    return mapping[dimKey] || mapping[slug] || String(slug).toUpperCase();
  };

  // Helper for dynamic hierarchy resolution
  const getHierarchyForDim = (dimKey: string, dimVal: string): DimensionLevel[] => {
    if (dimKey === 'prod') {
      if (['categorie', 'categorie+produit'].includes(dimVal)) return ['ALL', 'categorie', 'categorie+produit'];
      if (['fournisseur', 'fournisseur+produit'].includes(dimVal)) return ['ALL', 'fournisseur', 'fournisseur+produit'];
      if (dimVal === 'ALL') return ['ALL', 'categorie', 'categorie+produit'];
      return [dimVal as DimensionLevel];
    }
    return HIERARCHIES[dimKey] || [];
  };

  const handleHierarchyNav = (dimKey: string, direction: 'up' | 'down', coords?: { x: number, y: number }) => {
    const hierarchy = getHierarchyForDim(dimKey, dimensions[dimKey as keyof typeof dimensions]);
    if (!hierarchy.length) return;

    if (dimKey === 'prod' && dimensions.prod === 'ALL' && direction === 'down' && coords) {
      setShowProdDrillMenu(coords);
      return;
    }

    const currentVal = dimensions[dimKey as keyof typeof dimensions];
    const currentIndex = hierarchy.indexOf(currentVal);
    if (currentIndex === -1) return;

    if (direction === 'down' && currentIndex < hierarchy.length - 1) {
      updateDimension(dimKey as keyof typeof dimensions, hierarchy[currentIndex + 1]);
    } else if (direction === 'up' && currentIndex > 0) {
      updateDimension(dimKey as keyof typeof dimensions, hierarchy[currentIndex - 1]);
    }
  };

  const updateDimension = (key: keyof typeof dimensions, val: DimensionLevel) => {
    const nextDimensions = { ...dimensions, [key]: val };
    const allCount = Object.values(nextDimensions).filter(v => v === 'ALL').length;

    if (allCount === 4) {
      setError("Cannot select 'ALL' for all dimensions simultaneously.");
      return;
    }

    setError(null);
    setDimensions(nextDimensions);
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
        body: JSON.stringify({ ...dimensions, filters })
      });

      const result: APIResponse = await response.json();

      if (result.success) {
        // Enforce numeric types for measures to prevent chart inconsistencies
        const measureKeys = Object.keys(MEASURE_LABELS);
        const parsedData = result.data.map(rec => {
          const newRec = { ...rec };
          measureKeys.forEach(m => {
            if (newRec[m] !== undefined && newRec[m] !== null) {
              newRec[m] = Number(newRec[m]);
            }
          });
          return newRec;
        });

        setOlapData(parsedData);
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
  }, [dimensions, filters]);

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
        if (dimensions.temp === 'ALL') newDimensions.temp = 'year';
        else if (dimensions.temp === 'year') newDimensions.temp = 'year+saison';
        else if (dimensions.temp === 'year+saison') newDimensions.temp = 'year+month';
        break;
      case 'emp':
        if (dimensions.emp === 'DEPARTEMENT') newDimensions.emp = 'DEPARTEMENT+EMPLOYE';
        break;
      case 'prod':
        if (dimensions.prod === 'categorie') newDimensions.prod = 'categorie+produit';
        else if (dimensions.prod === 'fournisseur') newDimensions.prod = 'fournisseur+produit';
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
    setFilters({});
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

  /* Custom Tooltip for Enhanced Context (Employee, Dept, etc.) */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rec = payload[0].payload;
      return (
        <div className={`p-3 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'} shadow-2xl`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${theme.textSecondary} border-b border-slate-100 dark:border-slate-700 pb-1`}>
            {label}
          </p>
          <div className="space-y-1 mb-2">
            {dimensionColumns
              .filter(col => col !== chartXAxis && col !== 'month' && col !== 'year' && rec[col])
              .map(col => (
                <div key={col} className="flex justify-between gap-4 text-xs">
                  <span className={`font-semibold capitalize opacity-70 ${theme.text}`}>{col}:</span>
                  <span className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{rec[col]}</span>
                </div>
              ))
            }
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700">
            {payload.map((p: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                <span className={`${theme.textSecondary} capitalize`}>{p.name}:</span>
                <span className={`font-mono font-bold ${theme.text}`}>{Number(p.value).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div dir="ltr" className={`${isDarkMode ? 'dark' : ''} flex h-screen ${theme.bg} transition-colors duration-300 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100`}>

      {/* Sidebar - RESTORED FOR NAVIGATION ONLY */}
      <aside className={`${theme.sidebarBg} border-r ${theme.border} transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col shadow-xl z-20 shrink-0`}>
        <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 h-[60px]">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className={`font-extrabold text-xl ${theme.text} tracking-tight`}>DataVision</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-[0.2em] mb-4 px-3`}>
            {sidebarOpen ? 'Navigation' : '...'}
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
            {sidebarOpen ? 'Quick Analysis' : '...'}
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
        <header className={`${theme.cardBg} border-b ${theme.border} h-[60px] flex items-center justify-between px-6 shadow-sm z-10 shrink-0`}>
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
                placeholder="Search dimensions & measures..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={`pl-10 pr-4 py-2 rounded-full border ${theme.border} ${theme.input} text-xs font-medium w-64 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
              />
              {searchTerm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full shadow-sm animate-in fade-in scale-in-95">
                    {totalRows}
                  </span>
                  <button
                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              )}
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
            <div className="flex items-center justify-between px-6 lg:px-10 py-1">
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
              <div className="flex flex-col lg:flex-row items-center gap-4 px-6 lg:px-10 pb-1">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full relative">
                  {/* Backdrop for closing dropdowns */}
                  {openDropdown && (
                    <div className="fixed inset-0 z-[60]" onClick={() => setOpenDropdown(null)}></div>
                  )}
                  {[
                    { key: 'temp', val: dimensions.temp, set: (v: any) => updateDimension('temp', v), opts: [['ALL', 'All Time'], ['year', 'Year'], ['year+saison', 'Season & Year'], ['year+month', 'Month & Year (Season)'], ['DIVIDER', ''], ['saison', 'Season'], ['month', 'Month']], label: 'Time', icon: Calendar },
                    { key: 'emp', val: dimensions.emp, set: (v: any) => updateDimension('emp', v), opts: [['ALL', 'All Staff'], ['EMPLOYE', 'Employee'], ['DEPARTEMENT', 'Department'], ['DEPARTEMENT+EMPLOYE', 'Dept & Emp']], label: 'Staff', icon: User },
                    { key: 'prod', val: dimensions.prod, set: (v: any) => updateDimension('prod', v), opts: [['ALL', 'All Products'], ['categorie', 'Category'], ['categorie+produit', 'Category & Product'], ['fournisseur', 'Supplier'], ['fournisseur+produit', 'Supplier & Product'], ['DIVIDER', ''], ['produit', 'Product Only'], ['categorie+produit+fournisseur', 'Cat & Prod & Supp']], label: 'Product', icon: Box },
                    { key: 'clie', val: dimensions.clie, set: (v: any) => updateDimension('clie', v), opts: [['ALL', 'All Clients'], ['client', 'Client'], ['pays', 'Country'], ['pays+client', 'Country & Client']], label: 'Client', icon: MapPin }
                  ].map((dim, idx) => {
                    const hierarchy = getHierarchyForDim(dim.key, dim.val);
                    const currentIndex = hierarchy ? hierarchy.indexOf(dim.val) : -1;
                    const canDrill = hierarchy && currentIndex !== -1 && currentIndex < hierarchy.length - 1;
                    const canRoll = hierarchy && currentIndex !== -1 && currentIndex > 0;

                    return (
                      <div key={idx} className="relative group z-[70]">
                        <div className={`absolute -inset-1 bg-gradient-to-r ${isDarkMode ? 'from-blue-500/10 to-indigo-500/10' : 'from-blue-100 to-indigo-100'} rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur-[2px]`}></div>
                        <div className="relative flex flex-col items-center">
                          {/* Mini Label */}
                          <div className="w-full px-1.5 flex justify-between items-center mb-0.5">
                            <span className={`text-[7px] font-black uppercase tracking-tighter ${isDarkMode ? 'text-blue-400/60' : 'text-blue-600/60'}`}>{dim.label}</span>
                          </div>

                          <div className="relative w-full">
                            <button
                              onClick={() => setOpenDropdown(openDropdown === dim.key ? null : dim.key)}
                              className={`w-full flex items-center justify-between ${isDarkMode ? 'bg-[#1e293b] text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'} border rounded-lg pl-7 pr-2 py-1 text-[10px] font-bold transition-all shadow-sm hover:shadow-md outline-none hover:scale-[1.01] active:scale-[0.99]`}
                            >
                              <span className="truncate">{dim.opts.find(o => o[0] === dim.val)?.[1] || dim.val}</span>
                              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-300 ${openDropdown === dim.key ? 'rotate-180' : ''} opacity-40`} />
                            </button>
                            <dim.icon className={`w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} pointer-events-none`} />

                            {/* Custom Dropdown Menu */}
                            {openDropdown === dim.key && (
                              <div className={`absolute top-full left-0 mt-1 w-full min-w-[180px] rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#0f172a]/95' : 'bg-white/95'} backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 z-[110]`}>
                                <div className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent p-1">
                                  {dim.opts.map(([k, v]) => (
                                    k === 'DIVIDER' ? (
                                      <div key={k} className="my-1 border-t-2 border-slate-200 dark:border-slate-600"></div>
                                    ) : (
                                      <button
                                        key={k}
                                        onClick={() => { dim.set(k); setOpenDropdown(null); }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all mb-0.5 last:mb-0 ${dim.val === k ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : `${theme.text} hover:bg-slate-100 dark:hover:bg-slate-800`}`}
                                      >
                                        <span>{v}</span>
                                        {dim.val === k && <span className="text-white font-bold select-none">✓</span>}
                                      </button>
                                    )
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Hierarchy Controls UNDERNEATH (High Visibility Frame) */}
                          <div className="flex items-center justify-center w-full mt-1.5">
                            <div className={`flex items-center gap-4 p-0.5 px-3 rounded-full border-2 transition-all duration-300 ${isDarkMode ? 'bg-blue-900/30 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-blue-100 border-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.15)]'}`}>
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  handleHierarchyNav(dim.key, 'up', { x: rect.left, y: rect.bottom });
                                }}
                                disabled={!canRoll}
                                className={`p-1 rounded-full transition-all ${canRoll ? 'text-blue-500 hover:bg-white dark:hover:bg-slate-700' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
                                title="Roll-up"
                              >
                                <ChevronUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  handleHierarchyNav(dim.key, 'down', { x: rect.left, y: rect.bottom });
                                }}
                                disabled={!canDrill}
                                className={`p-1 rounded-full transition-all ${canDrill ? 'text-blue-500 hover:bg-white dark:hover:bg-slate-700' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
                                title="Drill-down"
                              >
                                <ChevronDown className="w-2.5 h-2.5" />
                              </button>
                              {dim.val !== 'ALL' && (
                                <button
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const candidates = dim.val.split('+');
                                    const resolvedCols = candidates.map(c => resolveColumn(c, dimensionColumns)).filter(Boolean);

                                    if (resolvedCols.length > 0) {
                                      setShowSlicer({
                                        cols: resolvedCols,
                                        activeCol: resolvedCols[resolvedCols.length - 1],
                                        x: rect.left,
                                        y: rect.bottom
                                      });
                                    }
                                  }}
                                  className={`p-1 rounded-full transition-all ${dim.val.split('+').some(c => {
                                    const resolved = resolveColumn(c, dimensionColumns);
                                    return filters[resolved];
                                  }) ? 'text-white bg-emerald-500 shadow-sm' : 'text-blue-500 hover:bg-white dark:hover:bg-slate-700'}`}
                                  title="Filter (Slice)"
                                >
                                  <Filter className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4 lg:ml-2">
                  <button onClick={resetFilters} className={`p-2.5 rounded-xl ${theme.hover} text-rose-500 transition-colors`} title="Reset"><X className="w-4 h-4" /></button>
                  <button onClick={fetchOLAPData} className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all"><Activity className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Active Filter Chips Display */}

            </div>
          </div>
          <div className="p-3 lg:p-5 space-y-5">
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
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Success</span>
                          <span className={`text-sm font-mono font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{Number(rec.total_retard).toFixed(1)}d</span>
                        </div>

                        {/* Detailed Context for Insights */}
                        <div className="space-y-1 mb-2">
                          {dimensionColumns
                            .filter(col => col !== 'month' && col !== 'year' && rec[col]) // Show all identifying columns
                            .map(col => (
                              <div key={col} className="flex justify-between gap-4 text-xs border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-0.5 last:border-0">
                                <span className={`font-semibold capitalize opacity-70 ${theme.text}`}>{col}:</span>
                                <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{rec[col]}</span>
                              </div>
                            ))
                          }
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-relaxed font-medium mt-1">{generateInsightText(rec, 'good')}</p>
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
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Critical</span>
                          <span className={`text-sm font-mono font-extrabold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>{Number(rec.total_retard).toFixed(1)}d</span>
                        </div>

                        {/* Detailed Context for Insights */}
                        <div className="space-y-1 mb-2">
                          {dimensionColumns
                            .filter(col => col !== 'month' && col !== 'year' && rec[col]) // Show all identifying columns
                            .map(col => (
                              <div key={col} className="flex justify-between gap-4 text-xs border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-0.5 last:border-0">
                                <span className={`font-semibold capitalize opacity-70 ${theme.text}`}>{col}:</span>
                                <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{rec[col]}</span>
                              </div>
                            ))
                          }
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-relaxed font-medium mt-1">{generateInsightText(rec, 'bad')}</p>
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
                <div
                  className={`w-full ${theme.cardBg} border ${theme.border} rounded-2xl p-5 shadow-sm relative group`}
                  onMouseEnter={() => setHoveredChart('planned-vs-real')}
                  onMouseLeave={() => setHoveredChart(null)}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary}`}>Planned vs. Real Duration</h3>

                    {/* Power BI Chart Toolbar */}
                    <div className={`flex items-center gap-2 transition-opacity duration-300 ${hoveredChart === 'planned-vs-real' ? 'opacity-100' : 'opacity-0'}`}>
                      <button
                        onClick={() => handleHierarchyNav(COLUMN_TO_DIMENSION[chartXAxis] || 'temp', 'up')}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                        title="Roll-up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleHierarchyNav(COLUMN_TO_DIMENSION[chartXAxis] || 'temp', 'down')}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                        title="Drill-down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setShowSlicer({ col: chartXAxis, x: rect.left, y: rect.bottom });
                        }}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                        title="Filter (Slice)"
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

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
                          content={<CustomTooltip />}
                          cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="moy_prevue" name="Planned Duration" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="moy_reelle" name="Real Duration" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                  <div
                    className={`lg:col-span-2 ${theme.cardBg} border ${theme.border} rounded-2xl p-5 shadow-sm relative group`}
                    onMouseEnter={() => setHoveredChart('main-analysis')}
                    onMouseLeave={() => setHoveredChart(null)}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary}`}>Main Analysis</h3>

                      {/* Power BI Chart Toolbar */}
                      <div className={`flex items-center gap-2 transition-opacity duration-300 ${hoveredChart === 'main-analysis' ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                          onClick={() => handleHierarchyNav(COLUMN_TO_DIMENSION[chartXAxis] || 'temp', 'up')}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                          title="Roll-up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleHierarchyNav(COLUMN_TO_DIMENSION[chartXAxis] || 'temp', 'down')}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                          title="Drill-down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setShowSlicer({ col: chartXAxis, x: rect.left, y: rect.bottom });
                          }}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                          title="Filter (Slice)"
                        >
                          <Filter className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart
                        data={olapData.slice(0, 25)}
                        onClick={(s: any) => s?.activePayload && handleDrillDown(s.activePayload[0].payload, (COLUMN_TO_DIMENSION[chartXAxis] || 'temp') as any)}
                        style={{ cursor: 'pointer' }}
                        margin={{ top: 10, right: 10, left: 40, bottom: 40 }}
                      >
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
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }} />
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
                        <Tooltip content={<CustomTooltip />} />
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
              <div className={`transition-all duration-500 ${isTableFullscreen ? 'fixed inset-0 z-[200] bg-white dark:bg-[#0f172a] overflow-hidden flex flex-col' : `mt-3 ${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden h-[calc(100vh-250px)] lg:h-[600px] flex flex-col relative`}`}>
                <div className={`p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${isTableFullscreen ? 'bg-white dark:bg-[#0f172a] sticky top-0 z-[210]' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg"><Layers className="w-3.5 h-3.5 text-blue-600" /></div>
                    <div>
                      <h3 className={`font-bold text-xs ${isTableFullscreen ? 'dark:text-white text-lg' : theme.text}`}>Detailed Records</h3>
                      <p className={`text-[9px] ${theme.textSecondary} flex items-center gap-1`}>
                        {totalRows} records
                        {(searchTerm || sortColumn) && <span className="text-blue-500">(Filtered)</span>}
                      </p>
                    </div>
                  </div>

                  {isTableFullscreen && (
                    <div className="hidden lg:flex items-center gap-2 flex-1 px-4 border-x border-slate-100 dark:border-slate-800 mx-4 justify-center">
                      {Object.entries({ temp: dimensions.temp, emp: dimensions.emp, prod: dimensions.prod, clie: dimensions.clie }).map(([key, val]) => {
                        const hierarchy = getHierarchyForDim(key, val);
                        const currentIndex = hierarchy.indexOf(val);
                        const canDrill = currentIndex !== -1 && currentIndex < hierarchy.length - 1;
                        const canRoll = currentIndex !== -1 && currentIndex > 0;
                        return (
                          <div key={key} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-800 h-8 shrink-0 hover:border-blue-400 transition-colors">
                            <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 px-1 border-r border-slate-200 dark:border-slate-700 mr-1">{key}</span>
                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 max-w-[60px] truncate">{val}</span>
                            <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 dark:border-slate-700 pl-1">
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  handleHierarchyNav(key, 'up', { x: rect.left, y: rect.bottom });
                                }}
                                disabled={!canRoll}
                                className={`p-1 rounded-full transition-all ${canRoll ? 'text-blue-500 hover:bg-white dark:hover:bg-slate-700' : 'text-slate-300 cursor-not-allowed'}`}
                              >
                                <ChevronUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  handleHierarchyNav(key, 'down', { x: rect.left, y: rect.bottom });
                                }}
                                disabled={!canDrill}
                                className={`p-1 rounded-full transition-all ${canDrill ? 'text-blue-500 hover:bg-white dark:hover:bg-slate-700' : 'text-slate-300 cursor-not-allowed'}`}
                              >
                                <ChevronDown className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const candidates = val.split('+');
                                  const dataKeys = olapData.length > 0 ? Object.keys(olapData[0]) : dimensionColumns;

                                  const resolvedCols = candidates.map(c => {
                                    let colToResolve = c;
                                    if (c === 'ALL') {
                                      if (key === 'temp') colToResolve = 'year';
                                      else if (key === 'emp') colToResolve = 'DEPARTEMENT';
                                      else if (key === 'prod') colToResolve = 'categorie';
                                      else if (key === 'clie') colToResolve = 'pays';
                                    }
                                    return resolveColumn(colToResolve, dimensionColumns);
                                  }).filter(Boolean);

                                  if (resolvedCols.length > 0) {
                                    setShowSlicer({
                                      cols: resolvedCols,
                                      activeCol: resolvedCols[resolvedCols.length - 1],
                                      x: rect.left,
                                      y: rect.bottom
                                    });
                                  }
                                }}
                                className={`p-1 rounded-full transition-all ${val.split('+').some(c => {
                                  const resolved = resolveColumn(c, dimensionColumns);
                                  return filters[resolved];
                                }) ? 'text-white bg-emerald-500' : 'text-blue-500 hover:bg-white dark:hover:bg-slate-700'}`}
                              >
                                <Filter className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {/* Secondary Search (Fullscreen only) */}
                    {isTableFullscreen && (
                      <div className="relative group mr-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search records..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                          }}
                          className={`pl-9 pr-8 py-1.5 rounded-full border ${theme.border} ${theme.input} text-[11px] font-medium w-48 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm`}
                        />
                        {searchTerm && (
                          <button
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3 text-slate-400" />
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => setIsTableFullscreen(!isTableFullscreen)}
                      className={`p-1.5 rounded-lg border transition-all active:scale-90 ${isDarkMode ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100'}`}
                      title={isTableFullscreen ? "Minimize" : "Maximize"}
                    >
                      {isTableFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    {!isTableFullscreen && (
                      <button onClick={handleExport} className="text-[10px] font-black uppercase tracking-tighter text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/40">Export CSV</button>
                    )}

                  </div>
                </div>

                <div
                  className={`flex-1 overflow-auto ${isTableFullscreen ? '' : 'rounded-2xl'} border border-slate-200 dark:border-slate-700 shadow-sm relative`}
                  style={{ height: isTableFullscreen ? 'calc(100vh - 120px)' : '500px' }}
                >
                  {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-40 flex items-center justify-center transition-all duration-300">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Synchronizing Data...</span>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-center text-[11px] border-separate border-spacing-0">
                    <thead className={`${isDarkMode ? 'bg-[#1e293b]' : 'bg-slate-50'} ${theme.textSecondary} shadow-sm`}>
                      <tr>
                        {/* Individual Dimension Headers */}
                        {dimensionColumns.map((col) => (
                          <th
                            key={col}
                            className={`
                              ${isTableFullscreen ? 'px-1 py-1.5' : 'px-2 py-2'} text-[10px] ${isTableFullscreen ? 'whitespace-normal min-w-[60px]' : 'whitespace-nowrap'} font-bold uppercase tracking-wider text-center cursor-pointer transition-all 
                              border-r border-b-2 border-slate-200 dark:border-slate-700/60
                              ${isDarkMode ? 'bg-[#1e293b] text-blue-300' : 'bg-slate-50 text-blue-700'}
                              hover:bg-slate-100 dark:hover:bg-slate-700
                              ${sortColumn === col ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''}
                              sticky top-0 z-30
                            `}
                            onClick={() => handleSort(col)}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <span>{getDimensionLabel(col)}</span>
                              {sortColumn === col && (
                                <span className="text-[8px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                        ))}

                        {/* Sharp Grid Measure Headers */}
                        {tableMeasures.map(m => (
                          <th
                            key={m}
                            className={`
                              ${isTableFullscreen ? 'px-1 py-1.5' : 'px-2 py-2'} text-[10px] ${isTableFullscreen ? 'whitespace-normal min-w-[50px]' : 'whitespace-nowrap'} font-bold uppercase tracking-wider text-center cursor-pointer transition-all 
                              border-r border-b-2 border-slate-200 dark:border-slate-700/60
                              ${isDarkMode ? 'bg-[#1e293b] text-slate-100' : 'bg-slate-50 text-slate-800'}
                              hover:bg-slate-100 dark:hover:bg-slate-700
                              ${sortColumn === m ? (isDarkMode ? 'bg-emerald-900/40' : 'bg-emerald-100/50') : ''}
                              sticky top-0 z-30
                            `}
                            onClick={() => handleSort(m)}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {MEASURE_LABELS[m]}
                              {sortColumn === m && (
                                <span className="text-[8px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-100 dark:divide-slate-700/50 transition-all duration-300 ${loading ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'} ${isTableFullscreen ? 'text-[9px]' : 'text-[11px]'}`}>
                      {paginatedData.map((row, i) => (
                        <tr
                          key={i}
                          onMouseEnter={() => setHoveredRow(i)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className={`
                            group transition-all duration-300 border-b border-slate-100 dark:border-slate-800/40
                            ${isDarkMode ? 'bg-[#0f172a] hover:bg-[#1e293b]' : 'hover:bg-blue-50/50 even:bg-slate-50/30'}
                            relative
                          `}
                        >
                          {/* Individual Dimension Data Cells */}
                          {dimensionColumns.map((col) => (
                            <td
                              key={col}
                              className={`
                                ${isTableFullscreen ? 'px-1 py-2' : 'px-2 py-3'} text-center ${isTableFullscreen ? 'text-[9px] whitespace-normal' : 'text-[10px] whitespace-nowrap'} font-bold tracking-tight
                                border-r border-b border-slate-100 dark:border-slate-800/40
                                ${theme.text}
                                transition-all duration-200
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
                                ${isTableFullscreen ? 'px-0.5 py-1.5' : 'px-2 py-2'} tabular-nums font-bold ${isTableFullscreen ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap text-center 
                                border-r border-b border-slate-100 dark:border-slate-800/40
                                ${theme.text} 
                                ${sortColumn === m ? (isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50/30') : ''}
                                ${m === 'moyenne_retard' ? (isTableFullscreen ? 'min-w-[60px]' : 'min-w-[80px]') : ''}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center mt-auto">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSecondary}`}>
                    Page {currentPage} of {totalPages} ({totalRows} records found)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`p-1.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm hover:shadow-md`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className={`p-1.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm hover:shadow-md`}
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

      {/* Slicer Overlay */}
      {showSlicer && (
        <>
          <div className="fixed inset-0 z-[250]" onClick={() => setShowSlicer(null)}></div>
          <div
            className={`fixed z-[260] w-56 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'} shadow-2xl p-2 animate-in fade-in zoom-in-95`}
            style={{ left: showSlicer.x, top: showSlicer.y + 10 }}
          >
            {/* Multi-Column Tabs */}
            {showSlicer.cols.length > 1 && (
              <div className="flex gap-1 mb-2 p-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                {showSlicer.cols.map(c => (
                  <button
                    key={c}
                    onClick={() => setShowSlicer({ ...showSlicer, activeCol: c })}
                    className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-md transition-all ${showSlicer.activeCol === c ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    {getDimensionLabel(c)}
                  </button>
                ))}
              </div>
            )}

            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between items-center">
              <span>Filter {getDimensionLabel(showSlicer.activeCol)}</span>
              {filters[showSlicer.activeCol] && (
                <button
                  onClick={() => {
                    const nf = { ...filters };
                    delete nf[showSlicer.activeCol];
                    setFilters(nf);
                  }}
                  className="text-[8px] text-rose-500 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              <button
                onClick={() => {
                  const nf = { ...filters };
                  delete nf[showSlicer.activeCol];
                  setFilters(nf);
                  setShowSlicer(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 transition-all ${!filters[showSlicer.activeCol] ? 'bg-blue-500 text-white' : `${theme.text} hover:bg-slate-100 dark:hover:bg-slate-800`}`}
              >
                (All)
              </button>
              {Array.from(new Set(olapData.map(r => {
                // Robust key matching inside data record
                const target = showSlicer.activeCol;
                let val = r[target];
                if (val === undefined) {
                  // Fallback: Case-insensitive key search
                  const actualKey = Object.keys(r).find(k => k.toLowerCase() === target.toLowerCase());
                  if (actualKey) val = r[actualKey];
                }
                return String(val ?? '').trim();
              }))).filter(v => v !== '').sort((a, b) => {
                // If numeric, sort numerically
                if (!isNaN(Number(a)) && !isNaN(Number(b))) return Number(a) - Number(b);
                return a.localeCompare(b);
              }).map(val => (
                <button
                  key={val}
                  onClick={() => {
                    setFilters({ ...filters, [showSlicer.activeCol]: val });
                    setShowSlicer(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 transition-all ${filters[showSlicer.activeCol] === val ? 'bg-blue-500 text-white' : `${theme.text} hover:bg-slate-100 dark:hover:bg-slate-800`}`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Product Drill Path Selector Overlay */}
      {showProdDrillMenu && (
        <>
          <div className="fixed inset-0 z-[250]" onClick={() => setShowProdDrillMenu(null)}></div>
          <div
            className={`fixed z-[260] w-48 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'} shadow-2xl p-3 animate-in fade-in zoom-in-95`}
            style={{ left: showProdDrillMenu.x, top: showProdDrillMenu.y + 10 }}
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3 px-1 border-b border-blue-100 pb-1">Select Drill Path</div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  updateDimension('prod', 'categorie');
                  setShowProdDrillMenu(null);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all ${isDarkMode ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-100 text-slate-800'} border ${theme.border}`}
              >
                <span>By Category</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
              <button
                onClick={() => {
                  updateDimension('prod', 'fournisseur');
                  setShowProdDrillMenu(null);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all ${isDarkMode ? 'hover:bg-slate-700 text-slate-100' : 'hover:bg-slate-100 text-slate-800'} border ${theme.border}`}
              >
                <span>By Supplier</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
