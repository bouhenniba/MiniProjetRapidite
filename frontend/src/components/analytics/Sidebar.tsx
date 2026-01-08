import { Activity, TrendingUp, Layers, User, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    viewMode: 'analytics' | 'raw';
    setViewMode: (mode: 'analytics' | 'raw') => void;
    runQuickAnalysis: (type: 'employee_performance' | 'dept_performance') => void;
    theme: any;
}

export const Sidebar = ({
    sidebarOpen,
    setSidebarOpen,
    viewMode,
    setViewMode,
    runQuickAnalysis,
    theme
}: SidebarProps) => {
    return (
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
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`p-2.5 rounded-xl ${theme.hover} ${theme.textSecondary} mx-auto block transition-transform active:scale-90`}
                >
                    {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            </div>
        </aside>
    );
};
