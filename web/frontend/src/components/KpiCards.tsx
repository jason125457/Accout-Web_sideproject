import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, PieChart, Shield, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { DashboardSummary, ChartDataPoint } from '../api';

interface KpiCardsProps {
  data: DashboardSummary;
  chartData?: ChartDataPoint[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ data, chartData = [] }) => {
  const isPnlPositive = data.total_stock_pnl_twd >= 0;

  // 計算上個月最後一筆資產，用於「較上月」比較
  const prevMonthChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    // 找到上個月的最後一筆
    const prevMonthPoints = chartData.filter((p) => {
      const d = new Date(p.date);
      const m = d.getMonth();
      const y = d.getFullYear();
      if (thisMonth === 0) return y === thisYear - 1 && m === 11;
      return y === thisYear && m === thisMonth - 1;
    });
    if (prevMonthPoints.length === 0) return null;
    const lastPrev = prevMonthPoints[prevMonthPoints.length - 1];
    const diff = data.total_net_worth_twd - lastPrev.total_net_worth;
    const pct = lastPrev.total_net_worth > 0 ? (diff / lastPrev.total_net_worth) * 100 : 0;
    return { diff, pct };
  }, [chartData, data.total_net_worth_twd]);

  // 計算最新單日變動（今日 vs 昨日）
  const latestDailyChange = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    const latest = chartData[chartData.length - 1];
    if (latest.daily_change_twd === undefined) return null;
    return {
      diff: latest.daily_change_twd,
      pct: latest.daily_change_pct ?? 0,
      date: latest.date
    };
  }, [chartData]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. 純流動總資產 */}
      <div className="fintech-card p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            純流動總資產 (淨值)
          </span>
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-baseline">
            <span className="text-sm font-semibold text-slate-400 mr-1.5">NT$</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {Math.round(data.total_net_worth_twd).toLocaleString()}
            </span>
          </div>

          {latestDailyChange && (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums ${
                latestDailyChange.diff >= 0
                  ? 'bg-red-50 text-red-700 border-red-200/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
              }`}
              title="較前一交易日淨值增減"
            >
              {latestDailyChange.diff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{latestDailyChange.diff >= 0 ? '+' : ''}{Math.round(latestDailyChange.diff).toLocaleString()}</span>
              <span className="text-[10px] opacity-80">({latestDailyChange.diff >= 0 ? '+' : ''}{latestDailyChange.pct.toFixed(2)}%)</span>
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            證券 {Math.round((data.strategy.core_ratio + data.strategy.satellite_ratio) * 100)}% · 現金 {Math.round(data.strategy.cash_ratio * 100)}%
          </span>
          {prevMonthChange !== null ? (
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold border ${
              prevMonthChange.pct >= 0
                ? 'bg-red-50 text-red-700 border-red-200/60'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
            }`}>
              {prevMonthChange.pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              較上月 {prevMonthChange.pct >= 0 ? '+' : ''}{prevMonthChange.pct.toFixed(1)}%
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
              全資產
            </span>
          )}
        </div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-400" />
      </div>


      {/* 2. 股票證券總現值 */}
      <div className="fintech-card p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            證券總市值 (折合台幣)
          </span>
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline">
          <span className="text-sm font-semibold text-slate-400 mr-1.5">NT$</span>
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {Math.round(data.total_stock_value_twd).toLocaleString()}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium truncate">
            原始投入：NT$ {Math.round(data.total_stock_cost_twd).toLocaleString()}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
            台美股跨帳戶
          </span>
        </div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
      </div>

      {/* 3. 股票未實現損益 */}
      <div className="fintech-card p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            投資未實現獲利
          </span>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isPnlPositive ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {isPnlPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>

        <div className="mt-3 flex items-baseline">
          <span className={`text-sm font-semibold mr-1.5 ${isPnlPositive ? 'text-red-500' : 'text-emerald-500'}`}>
            {isPnlPositive ? '+' : ''}NT$
          </span>
          <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
            isPnlPositive ? 'text-red-600' : 'text-emerald-600'
          }`}>
            {Math.round(data.total_stock_pnl_twd).toLocaleString()}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">累積加權報酬率</span>
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold border ${
              isPnlPositive
                ? 'bg-red-50 text-red-700 border-red-200/60'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
            }`}
          >
            {isPnlPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{isPnlPositive ? '+' : ''}{data.stock_return_rate.toFixed(2)}%</span>
          </span>
        </div>
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          isPnlPositive ? 'from-rose-500 via-red-500 to-amber-400' : 'from-emerald-500 via-teal-500 to-cyan-400'
        }`} />
      </div>

      {/* 4. 活存防禦現金 */}
      <div className="fintech-card p-6 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            防禦活存現金
          </span>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline">
          <span className="text-sm font-semibold text-slate-400 mr-1.5">NT$</span>
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {Math.round(data.total_cash_twd).toLocaleString()}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">佔總資產配置比重</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            {(data.strategy.cash_ratio * 100).toFixed(1)}% 安全邊際
          </span>
        </div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-400" />
      </div>
    </div>
  );
};

