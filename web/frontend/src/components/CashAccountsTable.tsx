import React from 'react';
import type { BankBalanceItem } from '../api';
import { Landmark, Edit3 } from 'lucide-react';

interface CashAccountsTableProps {
  banks: BankBalanceItem[];
  onOpenQuickCash: (accountId?: number) => void;
}

export const CashAccountsTable: React.FC<CashAccountsTableProps> = ({ banks, onOpenQuickCash }) => {
  const totalCashTwd = banks.reduce((sum, b) => sum + b.twd_amount, 0);

  return (
    <div className="fintech-card p-4 sm:p-6 overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/50">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              銀行現金部位明細
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              防禦流動資金池 · 多幣別網銀餘額即時核對
            </p>
          </div>
        </div>
        <button
          onClick={() => onOpenQuickCash()}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 transition-all text-xs font-bold active:scale-95 shadow-sm"
        >
          <Edit3 className="w-3.5 h-3.5 mr-0.5" />
          <span>全帳戶校對</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. 行動端 (iPhone) 專屬卡片清單 (md 以上隱藏)
         ───────────────────────────────────────────────────────────── */}
      <div className="block md:hidden space-y-3">
        {banks.map((b) => (
          <div
            key={b.account_id}
            className="bg-white rounded-2xl border border-[#ECE7DE] p-4 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{b.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    b.currency === 'USD'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                      : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  {b.currency}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-[#F5F2EB] px-2 py-0.5 rounded-lg border border-[#ECE7DE]">
                {(b.weight * 100).toFixed(1)}%
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">折合台幣小計</span>
                <span className="text-lg font-extrabold text-slate-900 font-mono tabular-nums">
                  NT$ {Math.round(b.twd_amount).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block">原幣金額</span>
                <span className="text-xs font-mono font-bold text-slate-600 tabular-nums">
                  {b.currency === 'USD' ? '$' : ''}
                  {b.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                {b.note || '生活備用與扣款專用'}
              </span>
              <button
                onClick={() => onOpenQuickCash(b.account_id)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#F5F2EB] hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-[#ECE7DE] font-bold text-xs active:scale-95 transition-all shadow-sm"
              >
                <Edit3 className="w-3 h-3 text-emerald-600" />
                <span>校準</span>
              </button>
            </div>
          </div>
        ))}

        {/* 行動端現金合計卡片 */}
        <div className="mt-4 p-4 rounded-2xl bg-[#F5F2EB] border border-[#ECE7DE] flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700">現金總額合計</span>
          <span className="text-sm font-mono font-extrabold text-emerald-800 tabular-nums">
            NT$ {Math.round(totalCashTwd).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 桌機版 (Desktop) 表格 (md 以上顯示)
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#ECE7DE] text-slate-500 font-bold bg-[#F5F2EB]/60">
              <th className="py-3.5 px-3">銀行機構</th>
              <th className="py-3.5 px-2 text-center">幣別</th>
              <th className="py-3.5 px-3 text-right">帳戶原幣金額</th>
              <th className="py-3.5 px-3 text-right">折合台幣小計</th>
              <th className="py-3.5 px-3 text-center">佔現金比重</th>
              <th className="py-3.5 px-4">功能定位與備註</th>
              <th className="py-3.5 px-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {banks.map((b) => (
              <tr key={b.account_id} className="hover:bg-[#F5F2EB]/50 transition-colors">
                <td className="py-3.5 px-3 font-bold text-slate-900">{b.name}</td>
                <td className="py-3.5 px-2 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.currency === 'USD'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {b.currency}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                  {b.currency === 'USD' ? '$' : ''}
                  {b.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                  NT$ {Math.round(b.twd_amount).toLocaleString()}
                </td>
                <td className="py-3.5 px-3 text-center font-mono text-slate-600 font-semibold tabular-nums">
                  {(b.weight * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-slate-500 font-medium">{b.note || '—'}</td>
                <td className="py-3.5 px-3 text-center">
                  <button
                    onClick={() => onOpenQuickCash(b.account_id)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-all text-xs font-semibold border border-slate-200 hover:border-emerald-200 active:scale-95 shadow-sm"
                  >
                    <Edit3 className="w-3 h-3 text-emerald-600" />
                    <span>校準</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#ECE7DE] bg-[#F5F2EB]/70 font-bold text-slate-900">
              <td colSpan={3} className="py-4 px-3">
                現金總額合計
              </td>
              <td className="py-4 px-3 text-right font-mono font-extrabold text-emerald-800 text-sm tabular-nums">
                NT$ {Math.round(totalCashTwd).toLocaleString()}
              </td>
              <td className="py-4 px-3 text-center font-mono tabular-nums">100.0%</td>
              <td colSpan={2} className="py-4 px-4 text-xs text-slate-500 font-medium">
                覆蓋日常應急與逢低加碼儲備
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
