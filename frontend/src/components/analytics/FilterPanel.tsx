import { Filter, ChevronDown, Calendar, User, Box, MapPin } from 'lucide-react';
import type { Dimensions, DimensionLevel } from '../../types/analytics.types';


interface FilterPanelProps {
    dimensions: Dimensions;
    updateDimension: (key: keyof Dimensions, val: DimensionLevel) => void;
    resetFilters: () => void;
    fetchOLAPData: () => void;
    filterPanelCollapsed: boolean;
    setFilterPanelCollapsed: (collapsed: boolean) => void;
    openDropdown: string | null;
    setOpenDropdown: (key: string | null) => void;
    handleHierarchyNav: (dimKey: string, direction: 'up' | 'down', coords?: { x: number, y: number }) => void;
    setShowSlicer: (slicer: { cols: string[], activeCol: string, x: number, y: number } | null) => void;
    filters: Record<string, string>;
    dimensionColumns: string[];
    theme: any;
    isDarkMode: boolean;
}

export const FilterPanel = ({
    dimensions,
    updateDimension,

    filterPanelCollapsed,
    setFilterPanelCollapsed,
    openDropdown,
    setOpenDropdown,
    theme,
    isDarkMode
}: FilterPanelProps) => {

    const filterOptions = [
        { key: 'temp', val: dimensions.temp, set: (v: any) => updateDimension('temp', v), opts: [['ALL', 'All Time'], ['year', 'Year'], ['year+saison', 'Season & Year'], ['year+month', 'Month & Year (Season)'], ['DIVIDER', ''], ['saison', 'Season'], ['month', 'Month']], label: 'Time', icon: Calendar },
        { key: 'emp', val: dimensions.emp, set: (v: any) => updateDimension('emp', v), opts: [['ALL', 'All Staff'], ['EMPLOYE', 'Employee'], ['DEPARTEMENT', 'Department'], ['DEPARTEMENT+EMPLOYE', 'Dept & Emp']], label: 'Staff', icon: User },
        { key: 'prod', val: dimensions.prod, set: (v: any) => updateDimension('prod', v), opts: [['ALL', 'All Products'], ['categorie', 'Category'], ['categorie+produit', 'Category & Product'], ['fournisseur', 'Supplier'], ['fournisseur+produit', 'Supplier & Product'], ['DIVIDER', ''], ['produit', 'Product Only'], ['categorie+produit+fournisseur', 'Cat & Prod & Supp']], label: 'Product', icon: Box },
        { key: 'clie', val: dimensions.clie, set: (v: any) => updateDimension('clie', v), opts: [['ALL', 'All Clients'], ['client', 'Client'], ['pays', 'Country'], ['pays+client', 'Country & Client']], label: 'Client', icon: MapPin }
    ];

    return (
        <div className={`sticky top-0 z-[100] ${theme.glass} border-b ${theme.border} backdrop-blur-xl transition-all duration-300 ${filterPanelCollapsed ? 'h-16' : 'h-auto'}`}>
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
                >
                    <ChevronDown className={`w-4 h-4 ${theme.text} transition-transform duration-300 ${filterPanelCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>

            <div className={`transition-all duration-300 ${filterPanelCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                <div className="flex flex-col lg:flex-row items-center gap-4 px-6 lg:px-10 pb-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full relative">
                        {openDropdown && (
                            <div className="fixed inset-0 z-[60]" onClick={() => setOpenDropdown(null)}></div>
                        )}
                        {filterOptions.map((dim, idx) => {


                            return (
                                <div key={idx} className="relative group z-[70]">
                                    <div className={`absolute -inset-1 bg-gradient-to-r ${isDarkMode ? 'from-blue-500/10 to-indigo-500/10' : 'from-blue-100 to-indigo-100'} rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur-[2px]`}></div>
                                    <div className="relative flex flex-col items-center">
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

                                            {openDropdown === dim.key && (
                                                <div className={`absolute top-full
                                                left-0 mt-1 w-full min-w-[180px] rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#0f172a]/95' : 'bg-white/95'} backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 z-[110]`}>
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


                                    </div>
                                </div>

                            );
                        })}
                    </div>


                </div>
            </div >
        </div >
    );
};
