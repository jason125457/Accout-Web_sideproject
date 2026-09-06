import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import type { DashboardSummary, ChartDataPoint } from '../api';
import { formatCurrency } from '../utils/formatters';

interface KpiCardsProps {
  data: DashboardSummary;
  chartData?: ChartDataPoint[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ data, chartData = [] }) => {
  const [isMasked, setIsMasked] = useState(false);
  const isPnlPositive = data.total_stock_pnl_twd >= 0;

  // 計算上個月最後一筆資產，用於「較上月」比較
  const prevMonthChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
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
      date: latest.date,
    };
  }, [chartData]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 min-w-0">
      {/* 1. 純流動總資產 */}
      <div className="fintech-card p-4 sm:p-5 relative flex flex-col justify-between overflow-hidden group min-w-0">
        <div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold tracking-tight flex items-center gap-1.5 text-slate-600">
              <Wallet className="w-3.5 h-3.5 text-teal-600" />
              純流動總資產 (淨值)
            </span>
            <button
              onClick={() => setIsMasked((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title={isMasked ? '顯示敏感金額' : '隱藏敏感金額'}
            >
              {isMasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="mt-2.5 flex items-baseline">
            <span className="text-sm font-bold text-slate-400 mr-1.5">NT$</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(data.total_net_worth_twd, isMasked)}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold flex-wrap">
            {latestDailyChange && (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold border ${
                  latestDailyChange.diff >= 0
                    ? 'bg-red-50 text-red-700 border-red-200/60'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                }`}
                title="較前一交易日淨值增減"
              >
                {latestDailyChange.diff >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>
                  {latestDailyChange.diff >= 0 ? '+' : ''}
                  {formatCurrency(latestDailyChange.diff, isMasked)}
                </span>
                <span className="text-[10px] opacity-80">
                  ({latestDailyChange.diff >= 0 ? '+' : ''}
                  {latestDailyChange.pct.toFixed(2)}%)
                </span>
              </span>
            )}
            {prevMonthChange !== null && (
              <span className="text-slate-400">
                較上月 {prevMonthChange.pct >= 0 ? '+' : ''}
                {prevMonthChange.pct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* 裝飾性 Sparkline 迷你曲線 */}
        <div className="mt-3 pt-2">
          <svg className="w-full h-8 text-teal-600/80 overflow-visible" viewBox="0 0 120 28" fill="none">
            <path
              d="M0 20 Q 20 8, 40 18 T 80 10 T 120 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="120" cy="12" r="3.5" fill="#0D9488" />
          </svg>
        </div>
      </div>

      {/* 2. 證券股票總現值 */}
      <div className="fintech-card p-4 sm:p-5 relative flex flex-col justify-between overflow-hidden group min-w-0">
        <div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold tracking-tight flex items-center gap-1.5 text-slate-600">
              <PieChart className="w-3.5 h-3.5 text-indigo-600" />
              證券投資現值
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50">
              佔 {Math.round(((data.total_stock_value_twd || 0) / (data.total_net_worth_twd || 1)) * 100)}%
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline">
            <span className="text-sm font-bold text-slate-400 mr-1.5">NT$</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(data.total_stock_value_twd, isMasked)}
            </span>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 font-semibold truncate">
            <span>投入本金：</span>
            <span className="font-bold text-slate-700">
              NT$ {formatCurrency(data.total_stock_cost_twd, isMasked)}
            </span>
          </div>
        </div>

        {/* 核心 vs 衛星比例進度條 */}
        <div className="mt-4 pt-1 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>核心 ETF {Math.round((data.strategy?.core_ratio || 0) * 100)}%</span>
            <span>衛星 {Math.round((data.strategy?.satellite_ratio || 0) * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="h-full bg-teal-500 rounded-l-full transition-all duration-500"
              style={{
                width: `${Math.round(((data.strategy?.core_value_twd || 0) / (data.total_stock_value_twd || 1)) * 100)}%`,
              }}
            />
            <div
              className="h-full bg-indigo-400 rounded-r-full transition-all duration-500"
              style={{
                width: `${Math.round(((data.strategy?.satellite_value_twd || 0) / (data.total_stock_value_twd || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. 股票未實現損益與報酬率 */}
      <div className="fintech-card p-4 sm:p-5 relative flex flex-col justify-between overflow-hidden min-w-0">
        <div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold tracking-tight flex items-center gap-1.5 text-slate-600">
              {isPnlPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-red-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              )}
              累積未實現損益
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isPnlPositive
                  ? 'bg-red-50 text-red-700 border-red-200/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
              }`}
            >
              {isPnlPositive ? '+' : ''}
              {data.stock_return_rate.toFixed(2)}%
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline">
            <span className="text-sm font-bold text-slate-400 mr-1.5">NT$</span>
            <span
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                isPnlPositive ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {isPnlPositive ? '+' : ''}
              {formatCurrency(data.total_stock_pnl_twd, isMasked)}
            </span>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 font-semibold truncate">
            {isPnlPositive ? (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 shrink-0" />
                整體被動指數佈局穩健獲利中
              </span>
            ) : (
              <span className="text-emerald-600 font-bold">
                逢低定期定額，持續拉低平均持有成本
              </span>
            )}
          </div>
        </div>

        {/* 損益歷史對照條 */}
        <div className="mt-4 pt-1 flex items-end gap-1 h-6">
          {[20, 35, 45, 60, 50, 70, 85, 95].map((val, idx) => (
            <div
              key={idx}
              className={`flex-1 rounded-sm transition-all ${
                idx >= 5
                  ? isPnlPositive
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                  : isPnlPositive
                  ? 'bg-red-200'
                  : 'bg-emerald-200'
              }`}
              style={{ height: `${val}%` }}
            />
          ))}
        </div>
      </div>

      {/* 4. 活存防禦現金水位 (金橙漸層卡片風格) */}
      <div className="relative rounded-[24px] p-4 sm:p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/20 border border-amber-400/40 group transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/30 min-w-0">
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-orange-700/30 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-200" />
              活存與防禦現金
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white">
              佔 {Math.round(((data.total_cash_twd || 0) / (data.total_net_worth_twd || 1)) * 100)}%
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline">
            <span className="text-sm font-bold text-amber-200 mr-1.5">NT$</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-sm">
              {formatCurrency(data.total_cash_twd, isMasked)}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-amber-100 font-medium leading-relaxed truncate">
            {data.strategy?.cash_status || '涵蓋日常開銷與市場回檔加碼備用金'}
          </p>
        </div>

        <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
          <span className="text-amber-100 text-[11px] font-medium">防禦狀態</span>
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs shadow-sm">
            <span>🛡️</span>
            <span>流動性充裕</span>
          </div>
        </div>
      </div>
    </div>
  );
};
