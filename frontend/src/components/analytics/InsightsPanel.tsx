import { TrendingUp, AlertCircle } from 'lucide-react';
import type { OLAPRecord, MeasureKey } from '../../types/analytics.types';
import { getExtremeRecords, generateInsightText } from '../../utils/analytics.utils';

interface InsightsPanelProps {
    olapData: OLAPRecord[];
    dimensionColumns: string[];
    theme: any;
    isDarkMode: boolean;
}

export const InsightsPanel = ({ olapData, dimensionColumns, theme, isDarkMode }: InsightsPanelProps) => {
    const topPerformers = getExtremeRecords(olapData, 'total_retard' as MeasureKey, 'min');
    const criticalItems = getExtremeRecords(olapData, 'total_retard' as MeasureKey, 'max');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className={`${theme.glass} p-6 rounded-2xl shadow-lg border border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <div className="w-32 h-32 rounded-full border-[16px] border-emerald-500/20 blur-xl"></div>
                </div>
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-3xl"></div>

                <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary} mb-6 flex items-center gap-2 relative z-10`}>
                    <span className="p-1 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                    </span>
                    Top Performers
                </h3>
                <div className="space-y-3 relative z-10">
                    {topPerformers.map((rec, i) => (
                        <div
                            key={i}
                            className={`flex flex-col p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-white/60 hover:bg-white/80'} backdrop-blur-sm border ${isDarkMode ? 'border-slate-700/50' : 'border-emerald-50'} hover:border-emerald-300 transition-all duration-300 shadow-sm hover:shadow-md cursor-default`}
                        >
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Success</span>
                                <span className={`text-sm font-mono font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    {Number(rec.total_retard).toFixed(1)}d
                                </span>
                            </div>
                            <div className="space-y-1 mb-2">
                                {dimensionColumns
                                    .filter(col => col !== 'month' && col !== 'year' && rec[col])
                                    .map(col => (
                                        <div key={col} className="flex justify-between gap-4 text-xs border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-0.5 last:border-0">
                                            <span className={`font-semibold capitalize opacity-70 ${theme.text}`}>{col}:</span>
                                            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{rec[col]}</span>
                                        </div>
                                    ))
                                }
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-relaxed font-medium mt-1">
                                {generateInsightText(rec, 'good', dimensionColumns)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Critical Items */}
            <div className={`${theme.glass} p-6 rounded-2xl shadow-lg border border-rose-100 dark:border-rose-900/30 relative overflow-hidden group`}>
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
                    {criticalItems.map((rec, i) => (
                        <div
                            key={i}
                            className={`flex flex-col p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-white/60 hover:bg-white/80'} backdrop-blur-sm border-l-[3px] border-l-rose-500 border-y border-r border-slate-100 dark:border-slate-700/50 hover:border-r-rose-200 transition-all duration-300 shadow-sm hover:shadow-md cursor-default`}
                        >
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Critical</span>
                                <span className={`text-sm font-mono font-extrabold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                                    {Number(rec.total_retard).toFixed(1)}d
                                </span>
                            </div>
                            <div className="space-y-1 mb-2">
                                {dimensionColumns
                                    .filter(col => col !== 'month' && col !== 'year' && rec[col])
                                    .map(col => (
                                        <div key={col} className="flex justify-between gap-4 text-xs border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-0.5 last:border-0">
                                            <span className={`font-semibold capitalize opacity-70 ${theme.text}`}>{col}:</span>
                                            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{rec[col]}</span>
                                        </div>
                                    ))
                                }
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-300 leading-relaxed font-medium mt-1">
                                {generateInsightText(rec, 'bad', dimensionColumns)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
