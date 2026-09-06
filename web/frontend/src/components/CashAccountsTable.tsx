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
    <div className="fintech-card p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">銀行現金部位明細</h3>
            <p className="text-xs text-slate-500 font-medium">防禦流動資金池 · 多幣別網銀餘額即時核對</p>
          </div>
        </div>
        <button
          onClick={() => onOpenQuickCash()}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 transition-all text-xs font-semibold active:scale-95 shadow-sm"
        >
          <Edit3 className="w-3.5 h-3.5 mr-1" />
          全帳戶快速校對
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 text-slate-500 font-bold bg-slate-50/80">
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
              <tr key={b.account_id} className="hover:bg-slate-50/80 transition-colors">
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
            <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900">
              <td colSpan={3} className="py-4 px-3">
                現金總額合計
              </td>
              <td className="py-4 px-3 text-right font-mono font-extrabold text-emerald-700 text-sm tabular-nums">
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
