import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Landmark,
  Calendar,
  Cloud,
  RefreshCw,
  X,
  TrendingUp,
} from 'lucide-react';

export type NavTabType = 'DASHBOARD' | 'HOLDINGS' | 'CASH' | 'DAILY';

interface SidebarProps {
  activeTab: NavTabType;
  onSelectTab: (tab: NavTabType) => void;
  isCloudConnected: boolean;
  isDemoMode: boolean;
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenSyncModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  holdingsCount?: number;
  banksCount?: number;
  historyCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCloudConnected,
  isDemoMode,
  isSyncing,
  onRefresh,
  onOpenSyncModal,
  isOpenMobile,
  onCloseMobile,
  holdingsCount = 0,
  banksCount = 0,
  historyCount = 0,
}) => {
  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111A18] text-slate-300 select-none">
      {/* 頂部品牌標誌 (iOS Safe Area 避震) */}
      <div className="px-6 pt-[max(1.75rem,calc(env(safe-area-inset-top,0px)+1.25rem))] pb-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E5A93C] to-[#B87C1E] flex items-center justify-center text-[#111A18] shadow-md shadow-black/20">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold text-white tracking-tight">資產中樞</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-emerald-400 font-bold tracking-normal">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">個人全資產智慧管理</p>
          </div>
        </div>

        {/* 行動端關閉抽屜按鈕 */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 active:scale-95 transition-all"
          aria-label="關閉導覽選單"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 導覽按鈕列表 */}
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
          分析與視圖
        </div>

        <button
          onClick={() => {
            onSelectTab('DASHBOARD');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'DASHBOARD'
              ? 'bg-gradient-to-r from-[#E5A93C] to-[#D4982E] text-[#111A18] shadow-lg shadow-[#E5A93C]/20'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">總覽儀表板</span>
        </button>

        <button
          onClick={() => {
            onSelectTab('HOLDINGS');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'HOLDINGS'
              ? 'bg-gradient-to-r from-[#E5A93C] to-[#D4982E] text-[#111A18] shadow-lg shadow-[#E5A93C]/20'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">證券持倉明細</span>
          {holdingsCount > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'HOLDINGS'
                  ? 'bg-black/20 text-[#111A18]'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {holdingsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            onSelectTab('CASH');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'CASH'
              ? 'bg-gradient-to-r from-[#E5A93C] to-[#D4982E] text-[#111A18] shadow-lg shadow-[#E5A93C]/20'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">銀行現金部位</span>
          {banksCount > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'CASH'
                  ? 'bg-black/20 text-[#111A18]'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {banksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            onSelectTab('DAILY');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'DAILY'
              ? 'bg-gradient-to-r from-[#E5A93C] to-[#D4982E] text-[#111A18] shadow-lg shadow-[#E5A93C]/20'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">每日淨值歷史</span>
          {historyCount > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'DAILY'
                  ? 'bg-black/20 text-[#111A18]'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {historyCount}
            </span>
          )}
        </button>

        <div className="pt-5 pb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
            系統與設定
          </div>
        </div>

        <button
          onClick={() => {
            onOpenSyncModal();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="flex-1 text-left">雲端連線設定</span>
          {isCloudConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          )}
        </button>
      </div>

      {/* 底部雲端連線狀態卡片 (iOS Safe Area 避震) */}
      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-white/5">
        <div className="bg-[#182622] rounded-2xl p-3.5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCloudConnected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-bold text-white">
                {isCloudConnected ? 'Google 試算表' : isDemoMode ? 'Demo 示範環境' : '本機 SQLite'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {isCloudConnected ? '即時同步' : '唯讀展示'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isCloudConnected
              ? '已與 Google 雲端試算表雙向連線'
              : '目前為擬真示範資料，隨時可綁定'}
          </p>
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isSyncing ? '同步更新中...' : '即時同步更新'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌機版固定左側欄 */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 shadow-xl shadow-black/10">
        {sidebarContent}
      </aside>

      {/* 行動端抽屜式選單 (含 Backdrop 遮罩與平滑滑入) */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
