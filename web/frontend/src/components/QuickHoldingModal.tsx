import React, { useState, useEffect } from 'react';
import { X, Check, Edit3 } from 'lucide-react';
import { api } from '../api';
import type { HoldingItem } from '../api';
import { formatStockTicker } from '../utils/formatters';

interface QuickHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: HoldingItem | null;
  onSuccess: () => void;
}

export const QuickHoldingModal: React.FC<QuickHoldingModalProps> = ({
  isOpen,
  onClose,
  holding,
  onSuccess,
}) => {
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (holding) {
      setShares(String(holding.shares));
      const initCost = holding.currency === 'USD'
        ? (holding.total_cost_original ?? Number((holding.avg_cost * holding.shares).toFixed(2)))
        : holding.total_cost_twd;
      setCost(String(initCost));
    }
  }, [holding, isOpen]);

  if (!isOpen || !holding) return null;

  const normalizedTicker = formatStockTicker(holding.ticker, holding.market, holding.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.adjustHolding(
        normalizedTicker,
        parseFloat(shares || '0'),
        parseFloat(cost || '0'),
        holding.currency
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('持倉校對失敗：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
      <div className="bg-white border border-[#ECE7DE] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-[#F5F2EB]/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200/50">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">校對持倉：{normalizedTicker}</h3>
              <p className="text-xs text-slate-500 font-medium">{holding.name} · {holding.market === 'TW' ? '台股' : '美股'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 mb-1.5 font-bold">持有總股數</label>
            <input
              type="number"
              step="any"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">若輸入 0 代表此檔全數賣出清倉</p>
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5 font-bold">
              投入總成本 ({holding.currency === 'USD' ? 'USD 美金' : 'TWD 台幣'})
            </label>
            <input
              type="number"
              step="any"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              required
            />
            {holding.currency === 'USD' ? (
              <p className="text-[11px] text-slate-500 mt-1">美股請填美金總成本，系統會自動按即時匯率折算台幣市值與損益</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">台股請填台幣總成本（買進價款扣款總額）</p>
            )}
          </div>

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
              {submitting ? '校對儲存中...' : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-teal-400" />
                  確認修改
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
