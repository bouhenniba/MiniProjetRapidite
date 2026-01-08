import { Package, Calendar, Activity, TrendingUp } from 'lucide-react';

interface KPICardsProps {
    totalRows: number;
    data: any[];
    theme: any;
}

export const KPICards = ({ totalRows, data, theme }: KPICardsProps) => {
    const avgDelay = data.length > 0
        ? (data.reduce((acc, curr) => acc + (Number(curr.moyenne_retard) || 0), 0) / data.length).toFixed(1)
        : '0.0';

    const kpis = [
        { label: 'Total Volume', val: totalRows, icon: Package, color: 'blue' },
        { label: 'Avg Delay', val: `${avgDelay}d`, icon: Calendar, color: Number(avgDelay) > 5 ? 'rose' : 'emerald' },
        { label: 'Throughput', val: '94%', icon: Activity, color: 'emerald' },
        { label: 'Efficiency', val: 'High', icon: TrendingUp, color: 'violet' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {kpis.map((kpi, i) => (
                <div
                    key={i}
                    className={`${theme.cardBg} border ${theme.border} border-b-4 border-b-${kpi.color}-500 p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 group lg:hover:-translate-y-1 relative overflow-hidden`}
                >
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
    );
};
