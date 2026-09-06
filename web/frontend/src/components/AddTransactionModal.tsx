import React, { useState } from 'react';
import { X, PlusCircle, Check } from 'lucide-react';
import { api } from '../api';
import type { BankBalanceItem } from '../api';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankBalanceItem[];
  onSuccess: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [accountId, setAccountId] = useState<number>(accounts[0]?.account_id || 1);
  const [ticker, setTicker] = useState('006208');
  const [action, setAction] = useState('BUY');
  const [shares, setShares] = useState<string>('100');
  const [price, setPrice] = useState<string>('118.5');
  const [fee, setFee] = useState<string>('15');
  const [currency, setCurrency] = useState('TWD');
  const [settlementAmount, setSettlementAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>('31.70');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const calculatedTotal = (parseFloat(shares || '0') * parseFloat(price || '0')) + parseFloat(fee || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const shs = parseFloat(shares);
      const prc = parseFloat(price);
      const fe = parseFloat(fee || '0');
      const total = calculatedTotal;

      await api.createTransaction({
        date,
        account_id: Number(accountId),
        ticker: ticker.trim().toUpperCase(),
        action,
        shares: shs,
        price: prc,
        total_amount: total,
        fee: fe,
        currency,
        exchange_rate: currency === 'USD' ? parseFloat(exchangeRate || '31.7') : 1.0,
        settlement_currency: 'TWD',
        settlement_amount: settlementAmount ? parseFloat(settlementAmount) : (currency === 'USD' ? total * parseFloat(exchangeRate || '31.7') : total),
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('新增交易失敗：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">新增交易日誌 (Transaction)</h3>
              <p className="text-xs text-slate-500 font-medium">紀錄證券買賣、配息或再投入，自動累計加權平均成本</p>
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
            <label className="block text-slate-700 mb-1.5 font-bold">關聯帳戶 / 券商</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              {accounts.map((acc) => (
                <option key={acc.account_id} value={acc.account_id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">交易日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">交易動作</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              >
                <option value="BUY">🟢 買進 (BUY)</option>
                <option value="SELL">🔴 賣出 (SELL)</option>
                <option value="DIVIDEND">💰 配息 (DIVIDEND)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">標的代號</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="例如 006208、TSLA"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono uppercase font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">計價幣別</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              >
                <option value="TWD">TWD 新台幣</option>
                <option value="USD">USD 美元</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">異動股數</label>
              <input
                type="number"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">成交單價 (原幣)</label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5 font-bold">手續費 (原幣)</label>
              <input
                type="number"
                step="any"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          {currency === 'USD' && (
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">成交匯率 (USD/TWD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-bold">實際扣款 (TWD，可留空)</label>
                <input
                  type="number"
                  step="any"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  placeholder="留空依匯率自動折算"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 mb-1.5 font-bold">備註說明</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：每月定期定額扣款"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/70 flex items-center justify-between text-xs">
            <span className="text-teal-900 font-semibold">原幣總額試算：</span>
            <span className="font-mono font-extrabold text-teal-800 text-sm tabular-nums">
              {currency === 'USD' ? '$' : 'NT$'} {calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
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
              {submitting ? '記錄中...' : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-teal-400" />
                  確認新增
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
