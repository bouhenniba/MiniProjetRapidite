import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

// Hooks & Utils
import { useAnalytics } from '../hooks/useAnalytics';

// Components
import { Sidebar } from './analytics/Sidebar';
import { Navbar } from './analytics/Navbar';
import { KPICards } from './analytics/KPICards';
import { InsightsPanel } from './analytics/InsightsPanel';
import { FilterPanel } from './analytics/FilterPanel';
import { ChartsSection } from './analytics/ChartsSection';
import { DataTable } from './analytics/DataTable';
import { SlicerOverlay, ProductDrillMenu } from './analytics/Overlays';

// Types & Constants
import type { MeasureKey, DimensionLevel, DrillPathItem, OLAPRecord } from '../types/analytics.types';

const AnalyticsDashboard = () => {
  // Theme & UI State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'analytics' | 'raw'>('analytics');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedMeasure, setSelectedMeasure] = useState<MeasureKey>('moyenne_retard');
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [chartXAxis, setChartXAxis] = useState<string>('');
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);

  // Overlay States
  const [showSlicer, setShowSlicer] = useState<{ cols: string[], activeCol: string, x: number, y: number } | null>(null);
  const [showProdDrillMenu, setShowProdDrillMenu] = useState<{ x: number, y: number } | null>(null);

  // Drill State
  const [drillPath, setDrillPath] = useState<DrillPathItem[]>([]);

  // Analytics Hook
  const {
    loading,
    error,
    olapData,
    dimensionColumns,
    dimensions,
    filters,
    setFilters,
    updateDimension,
    resetFilters,
    fetchOLAPData
  } = useAnalytics();

  useEffect(() => {
    if (dimensionColumns.length > 0 && !dimensionColumns.includes(chartXAxis)) {
      setChartXAxis(dimensionColumns[0]);
    }
  }, [dimensionColumns]);

  // Theme Configuration
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

  // Logic Handlers
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

    updateDimension(dimensionType, newDimensions[dimensionType]);
  };

  const handleDrillUp = () => {
    if (drillPath.length === 0) return;
    const previous = drillPath[drillPath.length - 1];

    // Batch update via direct setDimensions is not exposed but updateDimension is.
    // For simplicity, we'll update them one by one or expose a multi-update in hook.
    // Current hook only has updateDimension(key, val).
    updateDimension('temp', previous.temp);
    updateDimension('clie', previous.clie);
    updateDimension('emp', previous.emp);
    updateDimension('prod', previous.prod);

    setDrillPath(drillPath.slice(0, -1));
  };

  const handleHierarchyNav = (dimKey: string, direction: 'up' | 'down', coords?: { x: number, y: number }) => {
    let hierarchy: string[] = [];
    if (dimKey === 'temp') hierarchy = ['ALL', 'year', 'year+saison', 'year+month'];
    else if (dimKey === 'emp') hierarchy = ['ALL', 'DEPARTEMENT', 'DEPARTEMENT+EMPLOYE'];
    else if (dimKey === 'clie') hierarchy = ['ALL', 'pays', 'pays+client'];
    else if (dimKey === 'prod') {
      const curr = dimensions.prod;
      if (curr.includes('categorie')) {
        hierarchy = ['ALL', 'categorie', 'categorie+produit'];
      } else if (curr.includes('fournisseur')) {
        hierarchy = ['ALL', 'fournisseur', 'fournisseur+produit'];
      } else {
        // Default to category path if at ALL level
        hierarchy = ['ALL', 'categorie', 'categorie+produit'];
      }
    }

    if (dimKey === 'prod' && dimensions.prod === 'ALL' && direction === 'down' && coords) {
      setShowProdDrillMenu(coords);
      return;
    }


    const currentVal = dimensions[dimKey as keyof typeof dimensions];
    const currentIndex = hierarchy.indexOf(currentVal);
    if (currentIndex === -1) return;

    if (direction === 'down' && currentIndex < hierarchy.length - 1) {
      updateDimension(dimKey as keyof typeof dimensions, hierarchy[currentIndex + 1] as DimensionLevel);
    } else if (direction === 'up' && currentIndex > 0) {
      updateDimension(dimKey as keyof typeof dimensions, hierarchy[currentIndex - 1] as DimensionLevel);
    }
  };

  const runQuickAnalysis = (type: 'employee_performance' | 'dept_performance') => {
    resetFilters();
    if (type === 'employee_performance') {
      updateDimension('emp', 'EMPLOYE' as DimensionLevel);
      setSelectedMeasure('total_retard');
      setSortColumn('total_retard');
      setSortDirection('desc');
    } else if (type === 'dept_performance') {
      updateDimension('emp', 'DEPARTEMENT' as DimensionLevel);
      setSelectedMeasure('total_retard');
      setSortColumn('total_retard');
      setSortDirection('desc');
    }
    setViewMode('analytics');
  };

  return (
    <div dir="ltr" className={`${isDarkMode ? 'dark' : ''} flex h-screen ${theme.bg} transition-colors duration-300 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100 relative`}>
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/10 dark:bg-slate-900/40 backdrop-blur-[2px] transition-all duration-300">
          <div className={`p-6 rounded-3xl ${theme.glass} flex flex-col items-center gap-4 shadow-2xl scale-in-center border ${theme.border}`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 animate-pulse"></div>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin absolute top-0 left-0" />
            </div>
            <div className="flex flex-col items-center animate-pulse">
              <span className={`text-xs font-black uppercase tracking-widest ${theme.text}`}>Synthesizing Data</span>
              <span className={`text-[10px] font-bold ${theme.textSecondary} mt-1`}>Please wait...</span>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        runQuickAnalysis={runQuickAnalysis}
        theme={theme}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar
          viewMode={viewMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setCurrentPage={setCurrentPage}
          totalRows={olapData.length}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          theme={theme}
        />

        <main className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 relative">
          <FilterPanel
            dimensions={dimensions}
            updateDimension={updateDimension}
            resetFilters={resetFilters}
            fetchOLAPData={fetchOLAPData}
            filterPanelCollapsed={filterPanelCollapsed}
            setFilterPanelCollapsed={setFilterPanelCollapsed}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            handleHierarchyNav={handleHierarchyNav}
            setShowSlicer={setShowSlicer}
            filters={filters}
            dimensionColumns={dimensionColumns}
            theme={theme}
            isDarkMode={isDarkMode}
          />

          <div className="p-3 lg:p-5 space-y-5">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {viewMode === 'analytics' && (
              <>
                <KPICards totalRows={olapData.length} data={olapData} theme={theme} />

                {(dimensions.emp !== 'ALL' || dimensions.clie !== 'ALL' || dimensions.prod !== 'ALL') && (
                  <InsightsPanel olapData={olapData} dimensionColumns={dimensionColumns} theme={theme} isDarkMode={isDarkMode} />
                )}

                <ChartsSection
                  olapData={olapData}
                  dimensionColumns={dimensionColumns}
                  selectedMeasure={selectedMeasure}
                  setSelectedMeasure={setSelectedMeasure}
                  chartXAxis={chartXAxis}
                  setChartXAxis={setChartXAxis}
                  hoveredChart={hoveredChart}
                  setHoveredChart={setHoveredChart}
                  handleHierarchyNav={handleHierarchyNav}
                  handleDrillDown={handleDrillDown}
                  handleDrillUp={handleDrillUp}
                  drillPathLength={drillPath.length}
                  setShowSlicer={(s: any) => setShowSlicer(s ? { cols: [s.col], activeCol: s.col, x: s.x, y: s.y } : null)}
                  theme={theme}
                  isDarkMode={isDarkMode}
                />
              </>
            )}

            {viewMode === 'raw' && (
              <DataTable
                olapData={olapData}
                dimensionColumns={dimensionColumns}
                dimensions={dimensions}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                rowsPerPage={rowsPerPage}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                handleSort={handleSort}
                isTableFullscreen={isTableFullscreen}
                setIsTableFullscreen={setIsTableFullscreen}
                loading={loading}
                filters={filters}
                handleHierarchyNav={handleHierarchyNav}
                setShowSlicer={setShowSlicer}
                theme={theme}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        </main>
      </div>

      <SlicerOverlay
        showSlicer={showSlicer}
        setShowSlicer={setShowSlicer}
        filters={filters}
        setFilters={setFilters}
        olapData={olapData}
        theme={theme}
        isDarkMode={isDarkMode}
      />

      <ProductDrillMenu
        showProdDrillMenu={showProdDrillMenu}
        setShowProdDrillMenu={setShowProdDrillMenu}
        updateDimension={updateDimension}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default AnalyticsDashboard;
