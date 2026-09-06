import React, { useMemo } from 'react';
import { RefreshCw, DollarSign, PlusCircle, ShieldCheck, WalletCards, Sparkles, Pause, Play, Download, Cloud } from 'lucide-react';

interface NavbarProps {
  latestDate: string;
  usdRate: number;
  syncing: boolean;
  onSync: () => void;
  onOpenQuickCash: () => void;
  onOpenAddTx: () => void;
  countdown: number;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  isDemoMode?: boolean;
  isCloudConnected?: boolean;
  onOpenSyncModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  latestDate,
  usdRate,
  syncing,
  onSync,
  onOpenQuickCash,
  onOpenAddTx,
  countdown,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  isDemoMode = false,
  isCloudConnected = false,
  onOpenSyncModal,
}) => {
  // 行情新鮮度：當天=綠、超過1天=黃、超過3天=紅
  const freshness = useMemo(() => {
    if (!latestDate) return { color: 'text-slate-400', label: '未更新', dot: 'bg-slate-400' };
    const today = new Date();
    const date = new Date(latestDate);
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { color: 'text-emerald-700', label: '今日行情', dot: 'bg-emerald-500' };
    if (diffDays <= 1) return { color: 'text-amber-600', label: `${diffDays}天前`, dot: 'bg-amber-400' };
    return { color: 'text-red-600', label: `${diffDays}天前`, dot: 'bg-red-500' };
  }, [latestDate]);

  // 倒計時格式化：mm:ss
  const countdownLabel = useMemo(() => {
    const m = Math.floor(countdown / 60).toString().padStart(2, '0');
    const s = (countdown % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [countdown]);

  const handleExportCsv = async () => {
    try {
      const res = await fetch('/api/export/csv');
      if (!res.ok) throw new Error('匯出失敗');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `資產快照_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('CSV 匯出失敗，請確認後端運行中');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/70 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-900/15 border border-white/20 shrink-0">
              <WalletCards className="w-5 h-5 text-teal-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                  個人全資產戰略管理中樞
                </h1>
                <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 border border-teal-500/20 items-center gap-1 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  Fintech Hub
                </span>
              </div>
              <p className="hidden sm:flex items-center space-x-2 text-xs font-medium truncate mt-0.5">
                <span className="text-slate-500">
                  {isCloudConnected ? 'Google 試算表雲端連線' : isDemoMode ? 'Demo 示範環境' : '本地 SQLite 離線隱私'}
                </span>
                <span className="text-slate-300">•</span>
                {/* 行情新鮮度指示 */}
                <span className={`flex items-center gap-1 font-semibold ${freshness.color}`}>
                  <span className={`w-2 h-2 rounded-full ${freshness.dot} shrink-0`} />
                  ⏱ {latestDate || '--'} · {freshness.label}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center text-teal-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 mr-0.5" /> 加權移動平均成本
                </span>
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            {/* Cloud Sync / Demo Status Badge */}
            {isCloudConnected ? (
              <button
                onClick={onOpenSyncModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-all cursor-pointer shadow-sm shrink-0"
                title="Google 試算表雲端連線中 (點擊管理設定)"
              >
                <span className="w-2 h-2 rounded-full bg-teal-500 live-beacon shrink-0" />
                <span className="hidden sm:inline">雲端試算表已連線</span>
                <span className="sm:hidden">試算表</span>
              </button>
            ) : isDemoMode ? (
              <button
                onClick={onOpenSyncModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-sm shrink-0"
                title="目前為示範模式 (點擊連線您的 Google 試算表解鎖真實數據)"
              >
                <span>🎭 示範模式</span>
                <span className="hidden sm:inline text-[10px] underline font-medium">解鎖真實數據</span>
              </button>
            ) : (
              <button
                onClick={onOpenSyncModal}
                className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 transition-all cursor-pointer shrink-0"
                title="設定 Google 試算表雲端同步"
              >
                <Cloud className="w-3.5 h-3.5 text-teal-600" />
                <span>雲端同步</span>
              </button>
            )}

            {/* Live USD Rate Beacon */}
            <div
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 shrink-0"
              title="實時行情與匯率連線"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 live-beacon shrink-0" />
              <span className="hidden sm:inline">1 USD ≈ {usdRate.toFixed(2)} TWD</span>
              <span className="sm:hidden font-mono">${usdRate.toFixed(1)}</span>
            </div>

            {/* Auto-Refresh Countdown + Pause Toggle */}
            <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 font-mono">
              <button
                onClick={onToggleAutoRefresh}
                className="text-slate-400 hover:text-teal-600 transition-colors"
                title={autoRefreshEnabled ? '暫停自動同步' : '恢復自動同步'}
              >
                {autoRefreshEnabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <span className={autoRefreshEnabled ? 'text-teal-600 font-bold' : 'text-slate-400 line-through'}>
                {autoRefreshEnabled ? countdownLabel : '已暫停'}
              </span>
            </div>

            {/* Sync Button */}
            <button
              onClick={onSync}
              disabled={syncing}
              className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl text-teal-800 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-sm"
              title="立即自 TWSE 官方與 Yahoo Finance 更新最新收盤價與匯率"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-teal-600' : 'text-teal-700'}`} />
              <span className="hidden sm:inline sm:ml-1.5">{syncing ? '同步中' : '即時同步'}</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              className="hidden sm:inline-flex items-center justify-center space-x-1 px-3 py-2 text-xs font-semibold rounded-xl text-violet-800 bg-violet-50 hover:bg-violet-100/80 border border-violet-200/80 transition-all active:scale-95 shrink-0 shadow-sm"
              title="匯出今日資產快照為 CSV 檔"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 CSV</span>
            </button>

            {/* Quick Cash Button */}
            <button
              onClick={onOpenQuickCash}
              className="hidden sm:inline-flex items-center justify-center space-x-1 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 transition-all active:scale-95 shrink-0 shadow-sm"
              title="在 10 秒內快速校對網銀活存最新餘額"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>10秒現金校對</span>
            </button>

            {/* Add Transaction Button */}
            <button
              onClick={onOpenAddTx}
              className="inline-flex items-center justify-center space-x-1 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-95 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">手動記帳 / 交易</span>
              <span className="sm:hidden">交易</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
