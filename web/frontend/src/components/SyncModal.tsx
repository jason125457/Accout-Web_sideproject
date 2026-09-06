import React, { useState } from 'react';
import { X, ShieldCheck, Link2, Key, CheckCircle2, AlertCircle, Loader2, RotateCcw, Cloud } from 'lucide-react';
import type { GasConfig } from '../types/gas';
import { fetchFromGas } from '../utils/gasAssetApi';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GasConfig;
  onSave: (newConfig: GasConfig) => Promise<boolean>;
  onResetToDemo: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onResetToDemo
}) => {
  const [url, setUrl] = useState(config.webAppUrl || '');
  const [token, setToken] = useState(config.secretToken || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestResult({ success: false, message: '請輸入 Google Apps Script 網頁應用程式 URL' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const res = await fetchFromGas(url.trim(), token.trim());
    setIsTesting(false);

    if (res.success && res.data) {
      const holdingsCount = res.data.holdings?.length || 0;
      const banksCount = res.data.banks?.length || 0;
      const netWorth = Math.round(res.data.dashboard.total_net_worth_twd).toLocaleString();
      setTestResult({
        success: true,
        message: `連線成功！已讀取到 ${holdingsCount} 檔持倉、${banksCount} 個現金帳戶，純流動總淨值 NT$ ${netWorth}`
      });
    } else {
      setTestResult({
        success: false,
        message: res.message || '連線失敗，請檢查 Apps Script URL 與金鑰是否相符。'
      });
    }
  };

  const handleSaveAndSync = async () => {
    setIsSaving(true);
    const success = await onSave({
      webAppUrl: url.trim(),
      secretToken: token.trim(),
      isDemoMode: false,
      lastSyncTime: new Date().toLocaleString('zh-TW')
    });
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const handleSwitchToDemo = () => {
    onResetToDemo();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative my-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Google 試算表雲端同步設定</h3>
            <p className="text-xs text-slate-500 font-medium">
              連線至您的 Google Apps Script Web App，免開電腦 24 小時隨時讀取真實資產
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 text-sm">
          {/* Web App URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-teal-600" />
              網頁應用程式 URL (Web App URL)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              在 Google 試算表「擴充功能」-「Apps Script」完成部署後取得的 Web App 網址
            </p>
          </div>

          {/* Secret Token */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-teal-600" />
              API 存取金鑰 (Token)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="請填入 Code.gs 內設定的 API_SECRET_TOKEN"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              確保只有填入此金鑰的個人裝置才能讀取您的真實資產，他人僅能看到 Demo 示範資料
            </p>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl flex items-start space-x-2.5 text-xs ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                  : 'bg-rose-50 text-rose-800 border border-rose-200/80'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{testResult.message}</span>
            </div>
          )}

          {/* Privacy Note */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 flex items-start space-x-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800">零伺服器外流隱私保證</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                您的 URL 與金鑰僅保存在本機與手機瀏覽器（localStorage），前端部署在 Cloudflare Pages 上亦不會上傳任何帳目密鑰。
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSwitchToDemo}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all flex items-center justify-center space-x-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>切換回 Demo 示範模式</span>
          </button>

          <div className="w-full sm:w-auto flex items-center space-x-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !url.trim()}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 active:scale-95"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{isTesting ? '連線中...' : '測試連線'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isSaving || !url.trim()}
              className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-sm shadow-teal-900/10 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 active:scale-95"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{isSaving ? '儲存中...' : '儲存並同步'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
