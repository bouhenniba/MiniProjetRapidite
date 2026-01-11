import { getDimensionLabel } from '../../utils/analytics.utils';

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    chartXAxis: string;
    dimensionColumns: string[];
    isDarkMode: boolean;
    theme: any;
}

export const CustomTooltip = ({
    active,
    payload,
    label,
    chartXAxis,
    dimensionColumns,
    isDarkMode,
    theme
}: CustomTooltipProps) => {
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
