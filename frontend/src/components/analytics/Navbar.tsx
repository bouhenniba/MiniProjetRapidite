import { Search, X, Moon, Sun } from 'lucide-react';

interface NavbarProps {
    viewMode: 'analytics' | 'raw';
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    setCurrentPage: (page: number) => void;
    totalRows: number;
    isDarkMode: boolean;
    setIsDarkMode: (dark: boolean) => void;
    theme: any;
}

export const Navbar = ({
    viewMode,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
    totalRows,
    isDarkMode,
    setIsDarkMode,
    theme
}: NavbarProps) => {
    return (
        <header className={`${theme.cardBg} border-b ${theme.border} h-[60px] flex items-center justify-between px-6 shadow-sm z-10 shrink-0`}>
            <div className="flex flex-col justify-center">
                <h1 className={`text-lg font-extrabold ${theme.text} tracking-tight leading-tight`}>
                    {viewMode === 'analytics' ? 'Operational Intelligence' : 'Data Explorer'}
                </h1>
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${totalRows > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
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
    );
};
