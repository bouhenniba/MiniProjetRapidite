import { ChevronRight } from 'lucide-react';
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
    if (!showSlicer) return null;

    return (
        <>
            <div className="fixed inset-0 z-[250]" onClick={() => setShowSlicer(null)}></div>
            <div
                className={`fixed z-[260] w-56 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'} shadow-2xl p-2 animate-in fade-in zoom-in-95`}
                style={{ left: showSlicer.x, top: showSlicer.y + 10 }}
            >
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
                        const target = showSlicer.activeCol;
                        let val = r[target];
                        if (val === undefined) {
                            const actualKey = Object.keys(r).find(k => k.toLowerCase() === target.toLowerCase());
                            if (actualKey) val = r[actualKey];
                        }
                        return String(val ?? '').trim();
                    }))).filter(v => v !== '').sort((a, b) => {
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
