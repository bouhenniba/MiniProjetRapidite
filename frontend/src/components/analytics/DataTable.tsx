import { useState, useRef, useEffect } from 'react';
import { Layers, Search, ChevronUp, ChevronDown, Filter, X, Minimize2, Maximize2, Loader2, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Copy, Check } from 'lucide-react';
import type { OLAPRecord, Dimensions } from '../../types/analytics.types';
import { getDimensionLabel, resolveColumn, getHierarchyForDim, exportToCSV, copyToClipboard } from '../../utils/analytics.utils';
import { TABLE_MEASURES, MEASURE_LABELS } from '../../constants/analytics.constants';

interface DataTableProps {
    olapData: OLAPRecord[];
    dimensionColumns: string[];
    dimensions: Dimensions;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    currentPage: number;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    rowsPerPage: number;
    sortColumn: string | null;
    sortDirection: string;
    handleSort: (column: string) => void;
    isTableFullscreen: boolean;
    setIsTableFullscreen: (fullscreen: boolean) => void;
    loading: boolean;
    filters: Record<string, string>;
    handleHierarchyNav: (dimKey: string, direction: 'up' | 'down', coords?: { x: number, y: number }) => void;
    setShowSlicer: (slicer: { cols: string[], activeCol: string, x: number, y: number } | null) => void;
    handleExport?: () => void;
    theme: any;
    isDarkMode: boolean;
}

export const DataTable = ({
    olapData,
    dimensionColumns,
    dimensions,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    sortColumn,
    sortDirection,
    handleSort,
    isTableFullscreen,
    setIsTableFullscreen,
    loading,
    filters,
    handleHierarchyNav,
    setShowSlicer,
    theme,
    isDarkMode
}: DataTableProps) => {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
    const paginatedData = displayedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const maxDelay = Math.max(...olapData.map(d => Number(d.moyenne_retard) || 0), 1);

    const handleCopy = async () => {
        const success = await copyToClipboard(displayedData, true);
        if (success) {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
            setShowExportMenu(false);
        }
    };

    return (
        <div className={`transition-all duration-500 ${isTableFullscreen ? `fixed inset-0 z-[200] ${theme.bg} overflow-hidden flex flex-col p-3 lg:p-6` : `mt-3 ${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden h-[calc(100vh-250px)] lg:h-[600px] flex flex-col relative`}`}>
            <div className={`p-3 border-b ${theme.border} flex items-center justify-between ${isTableFullscreen ? `${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'} rounded-t-2xl shadow-sm z-[210]` : ''}`}>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg"><Layers className="w-3.5 h-3.5 text-blue-600" /></div>
                    <div>
                        <h3 className={`font-bold ${isTableFullscreen ? 'text-lg text-blue-600 dark:text-blue-400' : `text-xs ${theme.text}`}`}>Detailed Records</h3>
                        <p className={`text-[9px] ${theme.textSecondary} flex items-center gap-1`}>
                            {totalRows} records
                            {(searchTerm || sortColumn) && <span className="text-blue-500">(Filtered)</span>}
                        </p>
                    </div>
                </div>

                {isTableFullscreen && (
                    <div className="hidden lg:flex items-center gap-2 flex-1 px-4 border-x border-slate-100 dark:border-slate-800 mx-4 justify-center">
                        {Object.entries(dimensions).map(([key, val]) => {
                            const hierarchy = getHierarchyForDim(key, val);
                            const currentIndex = hierarchy.indexOf(val);
                            const canDrill = currentIndex !== -1 && currentIndex < hierarchy.length - 1;
                            const canRoll = currentIndex !== -1 && currentIndex > 0;
                            return (
                                <div key={key} className={`flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/80' : 'bg-white'} px-2.5 py-1 rounded-full border ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'} h-8 shrink-0 hover:border-blue-400 transition-all shadow-sm ring-1 ring-black/5`}>
                                    <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 px-1 border-r border-slate-200 dark:border-slate-700 mr-1">{getDimensionLabel(key)}</span>
                                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 max-w-[80px] truncate">
                                        {getDimensionLabel(val)}
                                    </span>
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

                                                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                                                console.log('🎯 FILTER BUTTON CLICKED');
                                                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                                                console.log('📊 Dimension:', key, '=', val);
                                                console.log('📋 Column Names:', dimensionColumns.join(', '));
                                                console.table(dimensionColumns);
                                                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                                                const resolvedCols = Array.from(new Set(candidates.map((c: string) => {
                                                    let colToResolve = c;
                                                    if (c === 'ALL') {
                                                        if (key === 'temp') colToResolve = 'year';
                                                        else if (key === 'emp') colToResolve = 'DEPARTEMENT';
                                                        else if (key === 'prod') colToResolve = 'categorie';
                                                        else if (key === 'clie') colToResolve = 'pays';
                                                    }
                                                    const resolved = resolveColumn(colToResolve, dimensionColumns);
                                                    return dimensionColumns.includes(resolved) ? resolved : null;
                                                }).filter(Boolean) as string[]));

                                                console.log('📝 Resolved filters for:', key, '->', resolvedCols.join(' + '));

                                                if (resolvedCols.length > 0) {
                                                    console.log('✅ SUCCESS: Showing slicer with columns:', resolvedCols);
                                                    setShowSlicer({
                                                        cols: resolvedCols,
                                                        activeCol: resolvedCols.length > 1 ? 'COMBINED' : resolvedCols[0],
                                                        x: rect.left,
                                                        y: rect.bottom
                                                    });
                                                } else {
                                                    console.error('❌ FAILURE: No valid columns found!');
                                                    console.error('   Dimension:', key, '=', val);
                                                    console.error('   Available columns:', dimensionColumns);
                                                    console.error('   Tried to resolve:', candidates);
                                                }
                                            }}
                                            className={`p-1.5 rounded-full transition-all ${val.split('+').some((c: string) => {
                                                const resolved = resolveColumn(c, dimensionColumns);
                                                return filters[resolved];
                                            }) ? 'text-white bg-emerald-600 shadow-md ring-2 ring-emerald-500/20' : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/60'}`}
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
                    >
                        {isTableFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    {!isTableFullscreen && (
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/40"
                            >
                                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
                                Export
                            </button>
                            {showExportMenu && (
                                <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl border ${theme.border} ${theme.bg} z-50 p-1 flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
                                    <button
                                        onClick={() => { exportToCSV(displayedData, true); setShowExportMenu(false); }}
                                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium ${theme.text} hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-left`}
                                    >
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                        Clean Report (CSV)
                                    </button>
                                    <button
                                        onClick={() => handleCopy()}
                                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium ${theme.text} hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-left`}
                                    >
                                        <Copy className="w-4 h-4 text-amber-500" />
                                        Copy for Sheets
                                    </button>
                                    <div className={`h-px my-1 ${theme.border} bg-slate-100 dark:bg-slate-700/50`} />
                                    <button
                                        onClick={() => { exportToCSV(displayedData, false); setShowExportMenu(false); }}
                                        className={`flex items-center gap-2 px-3 py-2 text-xs ${theme.textSecondary} hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-left`}
                                    >
                                        Download Raw Data
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`flex-1 overflow-auto ${isTableFullscreen ? 'rounded-b-2xl' : 'rounded-b-2xl'} border-x border-b ${theme.border} shadow-sm relative`}
                style={{ height: isTableFullscreen ? 'calc(100vh - 200px)' : '500px' }}
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

                            {TABLE_MEASURES.map(m => (
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
                    <tbody className={`divide-y ${theme.border} transition-all duration-300 ${loading ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'} text-[11px]`}>
                        {paginatedData.map((row, i) => (
                            <tr
                                key={i}
                                className={`
                  group transition-all duration-300 border-b ${theme.border}
                  ${isDarkMode ? 'bg-[#1e293b] hover:bg-[#2e3b4e] even:bg-[#1e293b]/60' : 'hover:bg-blue-50 even:bg-slate-50'}
                `}
                            >
                                {dimensionColumns.map((col) => (
                                    <td
                                        key={col}
                                        className={`
                      ${isTableFullscreen ? 'px-1 py-2' : 'px-2 py-3'} text-center ${isTableFullscreen ? 'text-[9px] whitespace-normal' : 'text-[10px] whitespace-nowrap'} font-bold tracking-tight
                      border-r border-b border-slate-100 dark:border-slate-800/40
                      ${theme.text}
                    `}
                                    >
                                        {String(row[col])}
                                    </td>
                                ))}

                                {TABLE_MEASURES.map(m => (
                                    <td
                                        key={m}
                                        className={`
                      ${isTableFullscreen ? 'px-0.5 py-1.5' : 'px-2 py-2'} tabular-nums font-bold ${isTableFullscreen ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap text-center 
                      border-r border-b border-slate-100 dark:border-slate-800/40
                      ${theme.text} 
                      ${sortColumn === m ? (isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50/30') : ''}
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

            <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center mt-auto">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSecondary}`}>
                    Page {currentPage} of {totalPages} ({totalRows} records found)
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`p-1.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className={`p-1.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm`}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
