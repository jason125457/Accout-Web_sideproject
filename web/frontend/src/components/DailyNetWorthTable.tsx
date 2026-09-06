import React, { useMemo } from 'react';
import type { ChartDataPoint } from '../api';
import { Calendar, ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react';

interface DailyNetWorthTableProps {
  data: ChartDataPoint[];
}

export const DailyNetWorthTable: React.FC<DailyNetWorthTableProps> = ({ data }) => {
  // 將資料依日期由新到舊倒序排列（今日在最上方）
  const reversedData = useMemo(() => {
    return [...data].reverse();
  }, [data]);

  // 統計摘要
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const values = data.map((d) => d.total_net_worth);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const startVal = data[0].total_net_worth;
    const endVal = data[data.length - 1].total_net_worth;
    const periodDiff = endVal - startVal;
    const periodPct = startVal > 0 ? (periodDiff / startVal) * 100 : 0;
    return { maxVal, minVal, periodDiff, periodPct, daysCount: data.length };
  }, [data]);

  return (
    <div className="fintech-card p-4 sm:p-6 overflow-hidden">
      {/* 標題與簡介 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200/50">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              每日資產淨值明細與變化歷史
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              每日收盤結算 · 單日淨值損益對比 · 跨日資產分佈追蹤
            </p>
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-[#F5F2EB] border border-[#ECE7DE] text-slate-600 font-medium">
              追蹤 {stats.daysCount} 個歷史記錄點
            </span>
            <span
              className={`px-3 py-1 rounded-xl border font-bold ${
                stats.periodDiff >= 0
                  ? 'bg-red-50 text-red-700 border-red-200/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
              }`}
            >
              區間淨累積：{stats.periodDiff >= 0 ? '+' : ''}NT$ {Math.round(stats.periodDiff).toLocaleString()} ({stats.periodDiff >= 0 ? '+' : ''}{stats.periodPct.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. 行動端 (iPhone) 專屬時間軸卡片 (md 以上隱藏)
         ───────────────────────────────────────────────────────────── */}
      <div className="block md:hidden space-y-3">
        {reversedData.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <TrendingUp className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">尚無每日淨值記錄</p>
          </div>
        ) : (
          reversedData.map((row, idx) => {
            const change = row.daily_change_twd ?? 0;
            const changePct = row.daily_change_pct ?? 0;
            const isPositive = change > 0;
            const isZero = change === 0;
            const stockRatio = row.total_net_worth > 0 ? (row.stock_value / row.total_net_worth) * 100 : 0;
            const cashRatio = row.total_net_worth > 0 ? (row.cash_value / row.total_net_worth) * 100 : 0;

            return (
              <div
                key={row.date}
                className="bg-white rounded-2xl border border-[#ECE7DE] p-4 shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">{row.date}</span>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                        最新結算
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border tabular-nums ${
                      isZero
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : isPositive
                        ? 'bg-red-50 text-red-700 border-red-200/60'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    }`}
                  >
                    {isZero ? (
                      <Minus className="w-3 h-3" />
                    ) : isPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span>{isPositive ? '+' : ''}{changePct.toFixed(2)}%</span>
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">純流動總淨值</span>
                    <span className="text-lg font-extrabold text-slate-900 font-mono tabular-nums">
                      NT$ {Math.round(row.total_net_worth).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold block">單日增減</span>
                    <span
                      className={`text-xs font-mono font-bold tabular-nums ${
                        isZero ? 'text-slate-500' : isPositive ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {isZero ? '--' : `${isPositive ? '+' : ''}NT$ ${Math.round(change).toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-indigo-700 font-semibold">
                      證券 NT$ {Math.round(row.stock_value).toLocaleString()}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      現金 NT$ {Math.round(row.cash_value).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    {Math.round(stockRatio)}% / {Math.round(cashRatio)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 桌機版 (Desktop) 表格 (md 以上顯示)
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#ECE7DE] text-slate-500 font-bold bg-[#F5F2EB]/60 border-l-4 border-l-transparent">
              <th className="py-3.5 px-3">日期</th>
              <th className="py-3.5 px-3 text-right">純流動總淨值 (TWD)</th>
              <th className="py-3.5 px-3 text-right">單日淨值變動 (TWD)</th>
              <th className="py-3.5 px-3 text-center">單日漲跌幅 (%)</th>
              <th className="py-3.5 px-3 text-right">證券部位市值 (TWD)</th>
              <th className="py-3.5 px-3 text-right">防禦現金部位 (TWD)</th>
              <th className="py-3.5 px-3 text-center">證券 / 現金比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reversedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <TrendingUp className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">尚無每日淨值記錄</p>
                    <p className="text-xs text-slate-400">當行情每日更新時，系統將自動落庫產生每日變化記錄。</p>
                  </div>
                </td>
              </tr>
            ) : (
              reversedData.map((row, idx) => {
                const change = row.daily_change_twd ?? 0;
                const changePct = row.daily_change_pct ?? 0;
                const isPositive = change > 0;
                const isZero = change === 0;

                const stockRatio = row.total_net_worth > 0 ? (row.stock_value / row.total_net_worth) * 100 : 0;
                const cashRatio = row.total_net_worth > 0 ? (row.cash_value / row.total_net_worth) * 100 : 0;

                return (
                  <tr
                    key={row.date}
                    className={`hover:bg-[#F5F2EB]/50 transition-colors border-l-4 ${
                      isZero
                        ? 'border-l-slate-300'
                        : isPositive
                        ? 'border-l-red-500'
                        : 'border-l-emerald-500'
                    }`}
                  >
                    {/* 日期 */}
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                      <span>{row.date}</span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                          最新
                        </span>
                      )}
                    </td>

                    {/* 純流動總淨值 */}
                    <td className="py-3.5 px-3 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                      NT$ {Math.round(row.total_net_worth).toLocaleString()}
                    </td>

                    {/* 單日淨值變動 */}
                    <td
                      className={`py-3.5 px-3 text-right font-mono font-bold tabular-nums ${
                        isZero
                          ? 'text-slate-400'
                          : isPositive
                          ? 'text-red-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {isZero ? '--' : `${isPositive ? '+' : ''}NT$ ${Math.round(change).toLocaleString()}`}
                    </td>

                    {/* 單日漲跌幅 */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold tabular-nums">
                      {isZero ? (
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          <Minus className="w-3 h-3" /> 0.00%
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isPositive
                              ? 'bg-red-50 text-red-700 border-red-200/60'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isPositive ? '+' : ''}{changePct.toFixed(2)}%
                        </span>
                      )}
                    </td>

                    {/* 證券市值 */}
                    <td className="py-3.5 px-3 text-right font-mono text-indigo-700 font-semibold tabular-nums">
                      NT$ {Math.round(row.stock_value).toLocaleString()}
                    </td>

                    {/* 現金部位 */}
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                      NT$ {Math.round(row.cash_value).toLocaleString()}
                    </td>

                    {/* 證券/現金佔比 */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-indigo-600 font-bold">{Math.round(stockRatio)}%</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-emerald-600 font-bold">{Math.round(cashRatio)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
