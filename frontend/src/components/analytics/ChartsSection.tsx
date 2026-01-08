import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Filter, ChevronUp } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import type { OLAPRecord, MeasureKey } from '../../types/analytics.types';
import { getDimensionLabel } from '../../utils/analytics.utils';
import { MEASURE_LABELS, COLUMN_TO_DIMENSION } from '../../constants/analytics.constants';
import { CustomTooltip } from './CustomTooltip';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

interface ChartsSectionProps {
    olapData: OLAPRecord[];
    dimensionColumns: string[];
    selectedMeasure: MeasureKey;
    setSelectedMeasure: (measure: MeasureKey) => void;
    chartXAxis: string;
    setChartXAxis: (axis: string) => void;
    hoveredChart: string | null;
    setHoveredChart: (chart: string | null) => void;
    handleHierarchyNav: (dimKey: string, direction: 'up' | 'down', coords?: { x: number, y: number }) => void;
    handleDrillDown: (record: OLAPRecord, dimensionType: 'temp' | 'emp' | 'prod' | 'clie') => void;
    handleDrillUp: () => void;
    drillPathLength: number;
    setShowSlicer: (slicer: { col: string, x: number, y: number } | null) => void;
    theme: any;
    isDarkMode: boolean;
}

export const ChartsSection = ({
    olapData,
    dimensionColumns,
    selectedMeasure,
    setSelectedMeasure,
    chartXAxis,
    setChartXAxis,
    hoveredChart,
    setHoveredChart,
    handleHierarchyNav,
    handleDrillDown,
    handleDrillUp,
    drillPathLength,
    setShowSlicer,
    theme,
    isDarkMode
}: ChartsSectionProps) => {
    const [secondaryDim, setSecondaryDim] = useState<string>('None');

    // Memoize processed data for the chart
    const { chartData, seriesKeys } = useMemo(() => {
        if (secondaryDim === 'None' || !dimensionColumns.includes(secondaryDim)) {
            return { chartData: olapData, seriesKeys: [] };
        }

        const nested: Record<string, any> = {};
        const keys = new Set<string>();

        olapData.forEach(row => {
            const xVal = String(row[chartXAxis] || 'Unknown');
            const sVal = String(row[secondaryDim] || 'Unknown');

            if (!nested[xVal]) {
                nested[xVal] = {
                    [chartXAxis]: xVal,
                    // Preserve other dimensions for tooltips/drills if needed (taking first occurrence)
                    ...row
                };
            }

            // For the measure, we might simply take the value if the row is unique for (x, s)
            // But if there are multiple rows for (x, s), we should strictly sum them?
            // Given the backend aggregates by requested dimensions, (x, s) should be unique.
            nested[xVal][sVal] = Number(row[selectedMeasure]) || 0;
            keys.add(sVal);
        });

        // Ensure all keys are present in all rows (fill with 0) for safety
        const data = Object.values(nested).map(row => {
            keys.forEach(k => {
                if (row[k] === undefined) row[k] = 0;
            });
            return row;
        });

        return { chartData: data, seriesKeys: Array.from(keys) };
    }, [olapData, chartXAxis, secondaryDim, selectedMeasure, dimensionColumns]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className={`text-lg font-bold ${theme.text}`}>Performance Visualization</h2>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <span className="text-[9px] font-bold uppercase px-2 text-slate-500">X-Axis:</span>
                        <select
                            value={chartXAxis}
                            onChange={(e) => setChartXAxis(e.target.value)}
                            className={`text-xs font-bold outline-none cursor-pointer hover:text-blue-500 transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'} py-1 pl-1 pr-2 rounded`}
                        >
                            {dimensionColumns.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                    </div>

                    <select
                        value={selectedMeasure}
                        onChange={(e) => setSelectedMeasure(e.target.value as MeasureKey)}
                        className={`px-4 py-2 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-[#1e293b] text-slate-100' : 'bg-white text-slate-800'} text-xs font-bold uppercase shadow-sm outline-none cursor-pointer hover:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`}
                    >
                        {Object.keys(MEASURE_LABELS).map((m) => (
                            <option key={m} value={m}>{MEASURE_LABELS[m as MeasureKey]}</option>
                        ))}
                    </select>
                    {drillPathLength > 0 && <button onClick={handleDrillUp} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900 dark:text-blue-400"><ChevronUp className="w-4 h-4" /></button>}
                </div>
            </div>

            <div
                className={`w-full ${theme.cardBg} border ${theme.border} border-b-4 border-b-blue-500 rounded-2xl p-5 shadow-sm relative group`}
                onMouseEnter={() => setHoveredChart('planned-vs-real')}
                onMouseLeave={() => setHoveredChart(null)}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary}`}>Planned vs. Real Duration</h3>
                    {/* ... (Tool buttons retained) ... */}
                </div>

                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={olapData.slice(0, 30)} margin={{ top: 10, right: 10, left: 40, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                            <XAxis
                                dataKey={chartXAxis || dimensionColumns[0]}
                                stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                                fontSize={10}
                                tickMargin={10}
                                label={{ value: `Dimension: ${getDimensionLabel(chartXAxis || dimensionColumns[0])}`, position: 'insideBottom', offset: -25, fontSize: 10, fontWeight: '800', fill: isDarkMode ? '#94a3b8' : '#1e293b', opacity: 0.5 }}
                            />
                            <YAxis
                                stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                                fontSize={10}
                                label={{ value: 'Duration (Days)', angle: -90, position: 'insideLeft', offset: -30, fontSize: 10, fontWeight: '800', fill: isDarkMode ? '#94a3b8' : '#1e293b', opacity: 0.5 }}
                            />
                            <Tooltip
                                content={<CustomTooltip chartXAxis={chartXAxis} dimensionColumns={dimensionColumns} isDarkMode={isDarkMode} theme={theme} />}
                                cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="moy_prevue" name="Planned Duration" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="moy_reelle" name="Real Duration" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                <div
                    className={`lg:col-span-2 ${theme.cardBg} border ${theme.border} rounded-2xl p-5 shadow-sm relative group`}
                    onMouseEnter={() => setHoveredChart('main-analysis')}
                    onMouseLeave={() => setHoveredChart(null)}
                >
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary}`}>Main Analysis</h3>
                            {/* Secondary Dimension Selector */}
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase ${theme.textSecondary}`}>Stack By:</span>
                                <select
                                    value={secondaryDim}
                                    onChange={(e) => setSecondaryDim(e.target.value)}
                                    className={`text-[10px] font-bold uppercase bg-transparent outline-none cursor-pointer hover:text-blue-500 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                                >
                                    <option value="None">None</option>
                                    {dimensionColumns.filter(c => c !== chartXAxis).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ... (Tool buttons) ... */}
                        <div className={`flex items-center gap-2 transition-opacity duration-300 ${hoveredChart === 'main-analysis' ? 'opacity-100' : 'opacity-0'}`}>
                            {/* Retained tool buttons logic */}
                            <button
                                onClick={() => handleHierarchyNav(COLUMN_TO_DIMENSION[chartXAxis] || 'temp', 'up')}
                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                            >
                                <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleHierarchyNav(COLUMN_TO_DIMENSION[chartXAxis] || 'temp', 'down')}
                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                            >
                                <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setShowSlicer({ col: chartXAxis, x: rect.left, y: rect.bottom });
                                }}
                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all"
                            >
                                <Filter className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart
                            data={chartData.slice(0, 25)}
                            onClick={(s: any) => {
                                // Only allow drill down if not in stacked mode or handle carefully
                                if (secondaryDim === 'None' && s?.activePayload) {
                                    handleDrillDown(s.activePayload[0].payload, (COLUMN_TO_DIMENSION[chartXAxis] || 'temp') as any);
                                }
                            }}
                            style={{ cursor: secondaryDim === 'None' ? 'pointer' : 'default' }}
                            margin={{ top: 10, right: 10, left: 40, bottom: 40 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                            <XAxis
                                dataKey={chartXAxis || dimensionColumns[0]}
                                stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                                fontSize={10}
                                tickMargin={10}
                                label={{ value: `Dimension: ${getDimensionLabel(chartXAxis || dimensionColumns[0])}`, position: 'insideBottom', offset: -25, fontSize: 10, fontWeight: '800', fill: isDarkMode ? '#94a3b8' : '#1e293b', opacity: 0.5 }}
                            />
                            <YAxis
                                stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                                fontSize={10}
                                label={{ value: MEASURE_LABELS[selectedMeasure], angle: -90, position: 'insideLeft', offset: -30, fontSize: 10, fontWeight: '800', fill: isDarkMode ? '#94a3b8' : '#1e293b', opacity: 0.5 }}
                            />
                            <Tooltip content={<CustomTooltip chartXAxis={chartXAxis} dimensionColumns={dimensionColumns} isDarkMode={isDarkMode} theme={theme} />} cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }} />

                            {secondaryDim === 'None' ? (
                                <Bar dataKey={selectedMeasure} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            ) : (
                                <>
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    {seriesKeys.map((key, index) => (
                                        <Bar
                                            key={key}
                                            dataKey={key}
                                            stackId="a"
                                            fill={COLORS[index % COLORS.length]}
                                            radius={[0, 0, 0, 0]}  // Stacked bars usually don't have radius except top
                                        />
                                    ))}
                                </>
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-5 shadow-sm`}>
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${theme.textSecondary} mb-4`}>Duration Trends</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={olapData.slice(0, 25)}>
                            <defs>
                                <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                            <XAxis hide />
                            <Tooltip content={<CustomTooltip chartXAxis={chartXAxis} dimensionColumns={dimensionColumns} isDarkMode={isDarkMode} theme={theme} />} />
                            <Area type="monotone" dataKey="moy_reelle" stroke="#8b5cf6" fill="url(#colorR)" />
                            <Area type="monotone" dataKey="moy_prevue" stroke="#10b981" fill="transparent" strokeDasharray="5 5" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
