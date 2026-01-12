import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { getDimensionLabel } from '../../utils/analytics.utils';

interface SlicerOverlayProps {
    showSlicer: { cols: string[], activeCol: string, x: number, y: number } | null;
    setShowSlicer: (slicer: any) => void;
    filters: Record<string, string>;
    setFilters: (filters: Record<string, string>) => void;
    olapData: any[];
    theme: any;
    isDarkMode: boolean;
}

export const SlicerOverlay = ({
    showSlicer,
    setShowSlicer,
    filters,
    setFilters,
    olapData,
    theme,
    isDarkMode
}: SlicerOverlayProps) => {
    // 1. Logic for extracting unique items from data
    const items = useMemo(() => {
        if (!showSlicer) return [];

        const { cols, activeCol } = showSlicer;
        const isMulti = cols.length > 1;

        // Data access helper
        const getVal = (record: any, col: string) => {
            let v = record[col];
            if (v === undefined || v === null) {
                const actualKey = Object.keys(record).find(k => k.toLowerCase() === col.toLowerCase());
                if (actualKey) v = record[actualKey];
            }
            return v;
        };

        const uniqueValues = new Set<string>();
        olapData.forEach(r => {
            if (isMulti) {
                const val = cols
                    .map(c => String(getVal(r, c) ?? '').trim())
                    .filter(v => v !== '')
                    .join(' › ');
                if (val) uniqueValues.add(val);
            } else {
                const val = String(getVal(r, activeCol) ?? '').trim();
                if (val) uniqueValues.add(val);
            }
        });

        return Array.from(uniqueValues).sort((a, b) => {
            if (!isNaN(Number(a)) && !isNaN(Number(b))) return Number(a) - Number(b);
            return a.localeCompare(b);
        });
    }, [showSlicer, olapData]);

    if (!showSlicer) return null;

    const isMulti = showSlicer.cols.length > 1;
    const hasActiveFilter = showSlicer.cols.some(c => filters[c]);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nf = { ...filters };
        showSlicer.cols.forEach(c => delete nf[c]);
        setFilters(nf);
    };

    const handleSelectAll = () => {
        const nf = { ...filters };
        showSlicer.cols.forEach(c => delete nf[c]);
        setFilters(nf);
        setShowSlicer(null);
    };

    const handleItemClick = (val: string) => {
        const newFilters = { ...filters };
        if (isMulti) {
            const parts = val.split(' › ');
            showSlicer.cols.forEach((c, idx) => {
                const actualVal = parts[idx];
                if (actualVal) newFilters[c] = actualVal;
            });
        } else {
            newFilters[showSlicer.activeCol] = val;
        }
        setFilters(newFilters);
        setShowSlicer(null);
    };

    return (
        <>
            <div className="fixed inset-0 z-[250]" onClick={() => setShowSlicer(null)}></div>
            <div
                className={`fixed z-[260] w-56 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'} shadow-2xl p-2 animate-in fade-in zoom-in-95`}
                style={{ left: showSlicer.x, top: showSlicer.y + 10 }}
            >
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between items-center">
                    <span>
                        Filter {isMulti ? 'Combined Levels' : getDimensionLabel(showSlicer.activeCol)}
                    </span>
                    {hasActiveFilter && (
                        <button
                            onClick={handleClear}
                            className="text-[8px] text-rose-500 hover:underline"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="max-h-48 overflow-y-auto scrollbar-thin">
                    <button
                        onClick={handleSelectAll}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 transition-all ${!hasActiveFilter
                            ? 'bg-blue-500 text-white shadow-md'
                            : `${theme.text} hover:bg-slate-100 dark:hover:bg-slate-800`
                            }`}
                    >
                        (All)
                    </button>

                    {items.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                            <p className="text-[10px] text-rose-500 font-bold mb-1">No values found</p>
                            <p className="text-[9px] text-slate-400">
                                Target: {isMulti ? showSlicer.cols.join('+') : showSlicer.activeCol}<br />
                                Data has {olapData.length} records
                            </p>
                        </div>
                    ) : (
                        items.map(val => {
                            const isSelected = isMulti
                                ? val === showSlicer.cols.map(c => filters[c]).filter(Boolean).join(' › ')
                                : filters[showSlicer.activeCol] === val;

                            return (
                                <button
                                    key={val}
                                    onClick={() => handleItemClick(val as string)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold mb-1 transition-all flex items-center gap-2 ${isSelected
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : `${theme.text} hover:bg-slate-100 dark:hover:bg-slate-700/50`
                                        }`}
                                >
                                    {isMulti ? (
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 w-full">
                                            {(val as string).split(' › ').map((part, i) => {
                                                const dimLabel = getDimensionLabel(showSlicer.cols[i]);
                                                return (
                                                    <span key={i} className="flex items-center gap-2">
                                                        {i > 0 && <span className={`text-[8px] ${isSelected ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'} font-black`}>›</span>}
                                                        <div className="flex flex-col">
                                                            <span className={`text-[6px] sm:text-[7px] font-black uppercase tracking-tighter ${isSelected ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'} leading-none mb-0.5`}>
                                                                {dimLabel}
                                                            </span>
                                                            <span className={`
                                                                text-[10px] sm:text-[11px] leading-tight
                                                                ${i === 0 ? 'font-black' : 'font-semibold'}
                                                                ${isSelected
                                                                    ? (i === 0 ? 'text-white' : 'text-blue-100')
                                                                    : (i === 0 ? (isDarkMode ? 'text-slate-100' : 'text-slate-900') : (isDarkMode ? 'text-slate-400' : 'text-slate-500'))
                                                                }
                                                            `}>
                                                                {part}
                                                            </span>
                                                        </div>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : val}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};

interface ProductDrillMenuProps {
    showProdDrillMenu: { x: number, y: number } | null;
    setShowProdDrillMenu: (menu: any) => void;
    updateDimension: (key: any, val: any) => void;
    theme: any;
    isDarkMode: boolean;
}

export const ProductDrillMenu = ({
    showProdDrillMenu,
    setShowProdDrillMenu,
    updateDimension,
    theme,
    isDarkMode
}: ProductDrillMenuProps) => {
    if (!showProdDrillMenu) return null;

    return (
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
    );
};
