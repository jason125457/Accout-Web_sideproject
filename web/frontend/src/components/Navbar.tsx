import React, { useMemo } from 'react';
import {
  RefreshCw,
  DollarSign,
  PlusCircle,
  Menu,
  Pause,
  Play,
  Cloud,
} from 'lucide-react';
import { getGreeting } from '../utils/formatters';

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
  onOpenMobileSidebar?: () => void;
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
  onOpenMobileSidebar,
}) => {
  const greeting = useMemo(() => getGreeting(), []);

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

  return (
    <header className="sticky top-0 z-20 bg-[#FBF9F5]/90 backdrop-blur-xl border-b border-[#ECE7DE] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px] gap-2">
          {/* 左側：行動端漢堡選單 + 迎賓時間問候 */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* 行動端抽屜漢堡鈕 */}
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 rounded-2xl bg-white border border-[#ECE7DE] text-slate-700 hover:bg-[#F5F2EB] active:scale-95 shadow-sm transition-all shrink-0"
              aria-label="打開導覽選單"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                  {greeting.text}，理財達人 {greeting.icon}
                </h2>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate mt-0.5">
                <span className="hidden sm:inline">
                  {isCloudConnected ? 'Google 雲端試算表' : isDemoMode ? 'Demo 示範環境' : '本機 SQLite'}
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className={`flex items-center gap-1 font-semibold ${freshness.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${freshness.dot} shrink-0`} />
                  {latestDate ? `${latestDate} · ${freshness.label}` : '即時待命'}
                </span>
              </p>
            </div>
          </div>

          {/* 右側：匯率、同步、操作控制項 */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* 匯率指示藥丸 */}
            <div
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#ECE7DE] text-slate-700 shadow-sm shrink-0"
              title="實時 USD/TWD 匯率"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 live-beacon shrink-0" />
              <span className="hidden sm:inline">1 USD ≈ {usdRate.toFixed(2)} TWD</span>
              <span className="sm:hidden font-mono font-bold">${usdRate.toFixed(1)}</span>
            </div>

            {/* 雲端連線狀態 */}
            {isCloudConnected ? (
              <button
                onClick={onOpenSyncModal}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100 transition-all cursor-pointer shadow-sm shrink-0 active:scale-95"
                title="Google 試算表雲端連線中 (點擊管理設定)"
              >
                <Cloud className="w-3.5 h-3.5 text-teal-600" />
                <span>雲端連線中</span>
              </button>
            ) : isDemoMode ? (
              <button
                onClick={onOpenSyncModal}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-sm shrink-0 active:scale-95"
                title="目前為示範模式 (點擊連線您的 Google 試算表)"
              >
                <span>🎭 示範模式</span>
              </button>
            ) : null}

            {/* 自動輪詢倒數 */}
            <div className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-[#ECE7DE] bg-white text-xs text-slate-600 font-mono shadow-sm">
              <button
                onClick={onToggleAutoRefresh}
                className="text-slate-400 hover:text-teal-600 transition-colors"
                title={autoRefreshEnabled ? '暫停自動同步' : '恢復自動同步'}
              >
                {autoRefreshEnabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <span className={autoRefreshEnabled ? 'text-teal-700 font-bold' : 'text-slate-400 line-through'}>
                {autoRefreshEnabled ? countdownLabel : '暫停'}
              </span>
            </div>

            {/* 即時同步按鈕 */}
            <button
              onClick={onSync}
              disabled={syncing}
              className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-2xl text-teal-800 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-sm"
              title="立即更新最新收盤價與匯率"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-teal-600' : 'text-teal-700'}`} />
              <span className="hidden sm:inline sm:ml-1.5">{syncing ? '同步中...' : '即時同步'}</span>
            </button>

            {/* 現金快速校對 */}
            <button
              onClick={onOpenQuickCash}
              className="hidden sm:inline-flex items-center justify-center space-x-1 px-3 py-2 text-xs font-bold rounded-2xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 transition-all active:scale-95 shrink-0 shadow-sm"
              title="快速校對網銀活存最新餘額"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>現金校對</span>
            </button>

            {/* 手動記帳 / 交易按鈕 */}
            <button
              onClick={onOpenAddTx}
              className="inline-flex items-center justify-center space-x-1 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-2xl text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-95 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">手動記帳</span>
              <span className="sm:hidden">記帳</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
