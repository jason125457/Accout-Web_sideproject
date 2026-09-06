import React, { useState, useMemo } from 'react';
import type { HoldingItem } from '../api';
import { Layers, Edit3 } from 'lucide-react';

interface HoldingsTableProps {
  holdings: HoldingItem[];
  onEditHolding?: (h: HoldingItem) => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, onEditHolding }) => {
  const [filter, setFilter] = useState<'ALL' | 'CORE_ETF' | 'SATELLITE' | 'TW' | 'US'>('ALL');

  const filteredHoldings = useMemo(() => {
    if (filter === 'ALL') return holdings;
    if (filter === 'CORE_ETF') return holdings.filter((h) => h.category === 'CORE_ETF');
    if (filter === 'SATELLITE') return holdings.filter((h) => h.category === 'SATELLITE');
    if (filter === 'TW') return holdings.filter((h) => h.market === 'TW');
    if (filter === 'US') return holdings.filter((h) => h.market === 'US');
    return holdings;
  }, [holdings, filter]);

  const totals = useMemo(() => {
    const cost = filteredHoldings.reduce((sum, h) => sum + h.total_cost_twd, 0);
    const val = filteredHoldings.reduce((sum, h) => sum + h.current_value_twd, 0);
    const pnl = val - cost;
    const ret = cost > 0 ? (pnl / cost) * 100 : 0;
    return { cost, val, pnl, ret };
  }, [filteredHoldings]);

  return (
    <div className="fintech-card p-6 overflow-hidden">
      {/* Table Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">證券與 ETF 持倉明細</h3>
            <p className="text-xs text-slate-500 font-medium">跨券商聚合計算 · 移動加權平均成本 · TWSE/Yahoo 即時連動</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs self-start sm:self-auto">
          {(['ALL', 'CORE_ETF', 'SATELLITE', 'TW', 'US'] as const).map((f) => {
            const labels: Record<string, string> = {
              ALL: '全部標的',
              CORE_ETF: '核心 ETF',
              SATELLITE: '衛星個股',
              TW: '台股',
              US: '美股',
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-xl font-medium transition-all ${
                  filter === f
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 text-slate-500 font-bold bg-slate-50/80 border-l-4 border-l-transparent">
              <th className="py-3.5 px-3">股號</th>
              <th className="py-3.5 px-3">標的名稱</th>
              <th className="py-3.5 px-2 text-center">市場</th>
              <th className="py-3.5 px-2 text-center">戰略板塊</th>
              <th className="py-3.5 px-3 text-right">總持股數</th>
              <th className="py-3.5 px-3 text-right">加權平均成本</th>
              <th className="py-3.5 px-3 text-right">最新收盤價</th>
              <th className="py-3.5 px-3 text-right">投入成本 (TWD)</th>
              <th className="py-3.5 px-3 text-right">折合台幣現值</th>
              <th className="py-3.5 px-3 text-right">未實現損益 (TWD)</th>
              <th className="py-3.5 px-3 text-center">報酬率 (%)</th>
              <th className="py-3.5 px-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredHoldings.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Layers className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">查無符合條件之持倉標的</p>
                    <p className="text-xs text-slate-400">
                      {filter !== 'ALL'
                        ? '目前篩選條件下無標的，可切換至「全部標的」。'
                        : '尚未建立持倉資料，可點擊右上角「手動記帳 / 交易」開始建立。'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredHoldings.map((h) => {
                const isPositive = h.unrealized_pnl_twd >= 0;
                return (
                  <tr
                    key={`${h.market}-${h.ticker}`}
                    className={`hover:bg-slate-50/80 transition-colors border-l-4 ${
                      isPositive ? 'border-l-red-500' : 'border-l-emerald-500'
                    } ${h.category === 'CORE_ETF' ? 'bg-teal-50/15' : ''}`}
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{h.ticker}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">{h.name}</td>
                    <td className="py-3.5 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.market === 'TW'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        }`}
                      >
                        {h.market}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          h.category === 'CORE_ETF'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                        }`}
                      >
                        {h.category === 'CORE_ETF' ? '核心' : '衛星'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                      {h.shares.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {h.currency === 'USD' ? '$' : ''}
                      {h.avg_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {h.currency === 'USD' ? '$' : ''}
                      {h.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                      <div>NT$ {Math.round(h.total_cost_twd).toLocaleString()}</div>
                      {h.currency === 'USD' && h.total_cost_original !== undefined && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          (${h.total_cost_original.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                      <div>NT$ {Math.round(h.current_value_twd).toLocaleString()}</div>
                      {h.currency === 'USD' && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          (${(h.shares * h.current_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </div>
                      )}
                    </td>
                    <td
                      className={`py-3.5 px-3 text-right font-mono font-bold tabular-nums ${
                        isPositive ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {isPositive ? '+' : ''}NT$ {Math.round(h.unrealized_pnl_twd).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold tabular-nums">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isPositive
                            ? 'bg-red-50 text-red-700 border-red-200/60'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {h.return_rate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <button
                        onClick={() => onEditHolding && onEditHolding(h)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 transition-all text-xs font-semibold border border-slate-200 hover:border-teal-200 active:scale-95 shadow-sm"
                        title="快速校對此檔持股數與成本均價"
                      >
                        <Edit3 className="w-3 h-3 text-teal-600" />
                        <span>校對</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredHoldings.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900 border-l-4 border-l-transparent">
                <td colSpan={4} className="py-4 px-3">
                  合計（共 {filteredHoldings.length} 檔標的）
                </td>
                <td colSpan={3}></td>
                <td className="py-4 px-3 text-right font-mono text-slate-600 tabular-nums">
                  NT$ {Math.round(totals.cost).toLocaleString()}
                </td>
                <td className="py-4 px-3 text-right font-mono font-extrabold text-teal-700 tabular-nums">
                  NT$ {Math.round(totals.val).toLocaleString()}
                </td>
                <td
                  className={`py-4 px-3 text-right font-mono font-extrabold tabular-nums ${
                    totals.pnl >= 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {totals.pnl >= 0 ? '+' : ''}NT$ {Math.round(totals.pnl).toLocaleString()}
                </td>
                <td className="py-4 px-3 text-center font-mono font-bold tabular-nums">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      totals.pnl >= 0 ? 'bg-red-50 text-red-700 border-red-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    }`}
                  >
                    {totals.pnl >= 0 ? '+' : ''}
                    {totals.ret.toFixed(2)}%
                  </span>
                </td>
                <td className="py-4 px-2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
