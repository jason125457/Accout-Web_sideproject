import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { ChartDataPoint } from '../api';

interface NetWorthChartProps {
  data: ChartDataPoint[];
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ data }) => {
  // 冷啟動防破圖處理：若數據點只有 1 個或為空，自動填充前一日參考點呈現連續基準線
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    if (data.length === 1) {
      const single = data[0];
      return [
        { ...single, date: '基準點' },
        { ...single, date: single.date }
      ];
    }
    return data;
  }, [data]);

  const formatYAxis = (val: number) => {
    if (val >= 1000000) return `${(val / 10000).toFixed(0)}萬`;
    return `${val}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload as ChartDataPoint | undefined;
      const changeTwd = point?.daily_change_twd;
      const changePct = point?.daily_change_pct;
      const hasChange = changeTwd !== undefined && changeTwd !== 0;

      return (
        <div className="backdrop-blur-md bg-slate-900/95 text-white border border-white/10 rounded-2xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-700/60">
            <span className="font-semibold text-slate-300">{label}</span>
            {hasChange && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                changeTwd >= 0 ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {changeTwd >= 0 ? '+' : ''}{Math.round(changeTwd).toLocaleString()} ({changeTwd >= 0 ? '+' : ''}{changePct?.toFixed(2)}%)
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-teal-300 font-bold flex items-center justify-between gap-4">
              <span>純流動總淨值</span>
              <span className="font-mono">NT$ {Math.round(payload[0]?.value || 0).toLocaleString()}</span>
            </p>
            {payload[1] && (
              <p className="text-indigo-300 font-medium flex items-center justify-between gap-4">
                <span>證券部位現值</span>
                <span className="font-mono">NT$ {Math.round(payload[1]?.value || 0).toLocaleString()}</span>
              </p>
            )}
            {payload[2] && (
              <p className="text-emerald-300 font-medium flex items-center justify-between gap-4">
                <span>防禦活存現金</span>
                <span className="font-mono">NT$ {Math.round(payload[2]?.value || 0).toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fintech-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">全資產淨值歷史走勢</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">每日收盤行情與現金累計自動落庫記錄</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 font-medium">
          最近 {chartData.length} 筆記錄
        </span>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            尚無歷史走勢數據
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total_net_worth"
                stroke="#0d9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorNetWorth)"
                name="純流動總資產"
              />
              <Area
                type="monotone"
                dataKey="stock_value"
                stroke="#6366f1"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorStock)"
                name="證券部位"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
