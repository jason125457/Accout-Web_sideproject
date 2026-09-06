import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign } from 'lucide-react';
import { api } from '../api';
import type { BankBalanceItem } from '../api';

interface QuickCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  banks: BankBalanceItem[];
  defaultAccountId?: number;
  onSuccess: () => void;
}

export const QuickCashModal: React.FC<QuickCashModalProps> = ({
  isOpen,
  onClose,
  banks,
  defaultAccountId,
  onSuccess,
}) => {
  const [balances, setBalances] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (banks.length > 0) {
      const initial: Record<number, string> = {};
      banks.forEach((b) => {
        initial[b.account_id] = String(b.current_balance);
      });
      setBalances(initial);
    }
  }, [banks, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (id: number, val: string) => {
    setBalances((prev) => ({ ...prev, [id]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      for (const b of banks) {
        const inputVal = parseFloat(balances[b.account_id] || '0');
        if (!isNaN(inputVal) && Math.abs(inputVal - b.current_balance) > 0.01) {
          await api.quickUpdateCash(b.account_id, inputVal, '網銀 10 秒快速校對');
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('校對更新發生錯誤：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">10 秒現金餘額快速校對</h3>
              <p className="text-xs text-slate-500 font-medium">輸入手機網銀當前最新餘額，系統自動計算差額日誌</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
          {banks.map((b) => {
            const currentVal = parseFloat(balances[b.account_id] || '0');
            const diff = !isNaN(currentVal) ? currentVal - b.current_balance : 0;
            const isHighlighted = defaultAccountId === b.account_id;

            return (
              <div
                key={b.account_id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isHighlighted
                    ? 'bg-teal-50/40 border-teal-300'
                    : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{b.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">原記錄：{b.current_balance.toLocaleString()}</span>
                    {Math.abs(diff) > 0.01 && (
                      <span
                        className={`font-mono font-bold text-[11px] px-1.5 py-0.2 rounded ${
                          diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {diff > 0 ? '+' : ''}
                        {diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-semibold">
                    {b.currency === 'USD' ? '$' : 'NT$'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={balances[b.account_id] ?? ''}
                    onChange={(e) => handleInputChange(b.account_id, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
              </div>
            );
          })}

          {/* Modal Footer */}
          <div className="pt-3 flex items-center justify-end space-x-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? '校準更新中...' : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-teal-400" />
                  確認儲存差額
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
