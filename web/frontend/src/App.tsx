import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import type { DashboardSummary, HoldingItem, BankBalanceItem, ChartDataPoint } from './api';
import type { GasConfig } from './types/gas';
import { fetchFromGas } from './utils/gasAssetApi';
import { DEMO_DASHBOARD, DEMO_HOLDINGS, DEMO_BANKS, DEMO_CHART } from './utils/demoAssetData';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { NetWorthChart } from './components/NetWorthChart';
import { StrategyCards } from './components/StrategyCards';
import { HoldingsTable } from './components/HoldingsTable';
import { CashAccountsTable } from './components/CashAccountsTable';
import { DailyNetWorthTable } from './components/DailyNetWorthTable';
import { QuickCashModal } from './components/QuickCashModal';
import { QuickHoldingModal } from './components/QuickHoldingModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { SyncModal } from './components/SyncModal';
import { Layers, Landmark, DollarSign, Calendar } from 'lucide-react';

const STORAGE_KEY = 'myasset_gas_config';
const AUTO_SYNC_INTERVAL = 5 * 60; // 5 分鐘

function getStoredGasConfig(): GasConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { webAppUrl: '', secretToken: '', isDemoMode: false };
}

export function App() {
  const [gasConfig, setGasConfig] = useState<GasConfig>(getStoredGasConfig);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [banks, setBanks] = useState<BankBalanceItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'HOLDINGS' | 'CASH' | 'DAILY'>('HOLDINGS');

  // 自動輪詢狀態
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [countdown, setCountdown] = useState(AUTO_SYNC_INTERVAL);
  const countdownRef = useRef(AUTO_SYNC_INTERVAL);
  const autoSyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modals state
  const [quickCashOpen, setQuickCashOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<number | undefined>();
  const [quickHoldingOpen, setQuickHoldingOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<HoldingItem | null>(null);
  const [addTxOpen, setAddTxOpen] = useState(false);

  const loadAllData = useCallback(async (currentConfig = gasConfig) => {
    try {
      setLoading(true);

      // 1. 如果已設定 Google Apps Script URL 且非 Demo 模式：從 Google 試算表載入
      if (currentConfig.webAppUrl && !currentConfig.isDemoMode) {
        const gasRes = await fetchFromGas(currentConfig.webAppUrl, currentConfig.secretToken);
        if (gasRes.success && gasRes.data) {
          setDashboard(gasRes.data.dashboard);
          setHoldings(gasRes.data.holdings);
          setBanks(gasRes.data.banks);
          setChartData(gasRes.data.chart);
          setIsDemoActive(false);
          return;
        } else {
          console.warn('Google 試算表連線失敗，自動啟用 Demo 模式:', gasRes.message);
        }
      }

      // 2. 如果為 Demo 模式：使用內建擬真示範資料
      if (currentConfig.isDemoMode) {
        setDashboard(DEMO_DASHBOARD);
        setHoldings(DEMO_HOLDINGS);
        setBanks(DEMO_BANKS);
        setChartData(DEMO_CHART);
        setIsDemoActive(true);
        return;
      }

      // 3. 預設嘗試本地 API（若在電腦本機端運行），失敗則無縫進入 Demo 示範模式
      try {
        const [dashRes, holdRes, bankRes, chartRes] = await Promise.all([
          api.getDashboard(),
          api.getHoldings(),
          api.getBanks(),
          api.getChart(),
        ]);
        setDashboard(dashRes);
        setHoldings(holdRes);
        setBanks(bankRes);
        setChartData(chartRes);
        setIsDemoActive(false);
      } catch (localErr) {
        // 在 Cloudflare Pages 等無本地伺服器環境下，自動以 Demo 模式呈現
        setDashboard(DEMO_DASHBOARD);
        setHoldings(DEMO_HOLDINGS);
        setBanks(DEMO_BANKS);
        setChartData(DEMO_CHART);
        setIsDemoActive(true);
      }
    } catch (err: any) {
      console.error('載入資料失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [gasConfig]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 儲存 Google 試算表連線設定
  const handleSaveGasConfig = async (newConfig: GasConfig): Promise<boolean> => {
    try {
      const test = await fetchFromGas(newConfig.webAppUrl, newConfig.secretToken);
      if (!test.success) {
        alert('連線失敗：' + test.message);
        return false;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      setGasConfig(newConfig);
      await loadAllData(newConfig);
      return true;
    } catch (e: any) {
      alert('儲存失敗：' + e.message);
      return false;
    }
  };

  // 重置回 Demo 模式
  const handleResetToDemo = () => {
    const demoConfig: GasConfig = { ...gasConfig, isDemoMode: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoConfig));
    setGasConfig(demoConfig);
    loadAllData(demoConfig);
  };

  // 倒計時 + 自動同步
  const resetCountdown = useCallback(() => {
    countdownRef.current = AUTO_SYNC_INTERVAL;
    setCountdown(AUTO_SYNC_INTERVAL);
  }, []);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
      return;
    }
    autoSyncTimerRef.current = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        countdownRef.current = AUTO_SYNC_INTERVAL;
        setCountdown(AUTO_SYNC_INTERVAL);
        // 自動靜默同步
        if (gasConfig.webAppUrl && !gasConfig.isDemoMode) {
          loadAllData();
        } else if (!isDemoActive) {
          api.syncMarket()
            .then(() => loadAllData())
            .catch(() => {});
        }
      }
    }, 1000);
    return () => {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
    };
  }, [autoRefreshEnabled, loadAllData, gasConfig, isDemoActive]);

  const handleSyncMarket = async () => {
    try {
      setSyncing(true);
      resetCountdown();
      if (gasConfig.webAppUrl && !gasConfig.isDemoMode) {
        await loadAllData();
      } else if (!isDemoActive) {
        await api.syncMarket();
        await loadAllData();
      } else {
        await loadAllData();
      }
    } catch (err: any) {
      alert('行情同步失敗：' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenQuickCash = (accountId?: number) => {
    if (isDemoActive) {
      alert('目前為 Demo 示範模式。連線您的 Google 試算表後，即可直接在試算表中調整現金或手動記帳！');
      return;
    }
    setSelectedBankId(accountId);
    setQuickCashOpen(true);
  };

  const handleEditHolding = (h: HoldingItem) => {
    if (isDemoActive) {
      alert('目前為 Demo 示範模式。連線您的 Google 試算表後，即可直接在「持倉明細」工作表中編輯股數與成本！');
      return;
    }
    setSelectedHolding(h);
    setQuickHoldingOpen(true);
  };

  if (loading && !dashboard) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">正在載入個人全資產戰略數據庫...</p>
      </div>
    );
  }

  const isCloudConnected = Boolean(gasConfig.webAppUrl && !gasConfig.isDemoMode);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-16 md:pb-0">
      {/* 頂部導覽列 */}
      <Navbar
        latestDate={dashboard?.latest_date || ''}
        usdRate={dashboard?.usd_twd_rate || 31.70}
        syncing={syncing}
        onSync={handleSyncMarket}
        onOpenQuickCash={() => handleOpenQuickCash()}
        onOpenAddTx={() => {
          if (isDemoActive) {
            alert('目前為 Demo 示範模式。連線您的 Google 試算表後，即可直接在試算表中新增交易！');
            return;
          }
          setAddTxOpen(true);
        }}
        countdown={countdown}
        autoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={() => setAutoRefreshEnabled((v) => !v)}
        isDemoMode={isDemoActive}
        isCloudConnected={isCloudConnected}
        onOpenSyncModal={() => setSyncModalOpen(true)}
      />

      {/* 主儀表板區域 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. 四大 KPI 卡片 */}
        {dashboard && <KpiCards data={dashboard} chartData={chartData} />}

        {/* 2. 中層圖表與戰略板塊 (兩欄佈局) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NetWorthChart data={chartData} />
          </div>
          <div className="lg:col-span-1">
            {dashboard && <StrategyCards strategy={dashboard.strategy} />}
          </div>
        </div>

        {/* 3. 下層分頁切換 (持倉明細 vs 銀行現金 vs 每日淨值) */}
        <div className="space-y-4">
          <div className="flex items-center space-x-1.5 p-1 bg-slate-200/70 rounded-2xl border border-slate-200/80 w-fit flex-wrap gap-y-1">
            <button
              onClick={() => setActiveTab('HOLDINGS')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'HOLDINGS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-teal-600" />
              <span>證券與 ETF 持倉明細 ({holdings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CASH')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'CASH'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-4 h-4 text-emerald-600" />
              <span>銀行現金部位明細 ({banks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('DAILY')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'DAILY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>每日資產淨值歷史 ({chartData.length})</span>
            </button>
          </div>

          {activeTab === 'HOLDINGS' && (
            <HoldingsTable holdings={holdings} onEditHolding={handleEditHolding} />
          )}
          {activeTab === 'CASH' && (
            <CashAccountsTable banks={banks} onOpenQuickCash={handleOpenQuickCash} />
          )}
          {activeTab === 'DAILY' && (
            <DailyNetWorthTable data={chartData} />
          )}
        </div>
      </main>

      {/* 頁尾（桌機版） */}
      <footer className="border-t border-slate-200/80 py-8 text-center text-xs text-slate-500 font-medium hidden md:block">
        <p>
          個人全資產戰略管理中樞 • {isCloudConnected ? 'Google 試算表雲端無伺服器架構' : isDemoActive ? 'Demo 示範環境' : '本地 SQLite 離線隱私加密儲存'} • Cloudflare Pages 全球 CDN 加速
        </p>
      </footer>

      {/* ── 行動端底部快速操作列（md 以上隱藏）── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 flex items-stretch shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <button
          onClick={() => handleOpenQuickCash()}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 transition-colors active:bg-emerald-100"
        >
          <DollarSign className="w-5 h-5" />
          <span>現金校對</span>
        </button>
        <div className="w-px bg-slate-200" />
        <button
          onClick={() => setSyncModalOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-bold text-teal-700 hover:bg-teal-50 transition-colors active:bg-teal-100"
        >
          <span className="text-base leading-none">☁️</span>
          <span>雲端同步</span>
        </button>
        <div className="w-px bg-slate-200" />
        <button
          onClick={handleSyncMarket}
          disabled={syncing}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors active:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCwIcon spinning={syncing} />
          <span>{syncing ? '同步中' : '同步行情'}</span>
        </button>
      </div>

      {/* 彈窗 */}
      <SyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        config={gasConfig}
        onSave={handleSaveGasConfig}
        onResetToDemo={handleResetToDemo}
      />

      <QuickCashModal
        isOpen={quickCashOpen}
        onClose={() => setQuickCashOpen(false)}
        banks={banks}
        defaultAccountId={selectedBankId}
        onSuccess={loadAllData}
      />

      <QuickHoldingModal
        isOpen={quickHoldingOpen}
        onClose={() => setQuickHoldingOpen(false)}
        holding={selectedHolding}
        onSuccess={loadAllData}
      />

      <AddTransactionModal
        isOpen={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        accounts={banks}
        onSuccess={loadAllData}
      />
    </div>
  );
}

function RefreshCwIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export default App;
