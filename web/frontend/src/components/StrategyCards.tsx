import React from 'react';
import type { StrategyAllocation } from '../api';
import { Target } from 'lucide-react';

interface StrategyCardsProps {
  strategy: StrategyAllocation;
}

export const StrategyCards: React.FC<StrategyCardsProps> = ({ strategy }) => {
  const pillars = [
    {
      title: '1. 核心大盤指數 ETF',
      value: strategy.core_value_twd,
      ratio: strategy.core_ratio,
      target: '50% ~ 70%',
      status: strategy.core_status,
      color: 'bg-teal-600',
      barBg: 'bg-teal-50',
      textColor: 'text-teal-700',
    },
    {
      title: '2. 活存與防禦現金',
      value: strategy.cash_value_twd,
      ratio: strategy.cash_ratio,
      target: '20% ~ 35%',
      status: strategy.cash_status,
      color: 'bg-emerald-600',
      barBg: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      title: '3. 衛星個股與主題',
      value: strategy.satellite_value_twd,
      ratio: strategy.satellite_ratio,
      target: '15% ~ 25%',
      status: strategy.satellite_status,
      color: 'bg-indigo-600',
      barBg: 'bg-indigo-50',
      textColor: 'text-indigo-700',
    },
  ];

  return (
    <div className="fintech-card p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">戰略資產配置診斷</h3>
              <p className="text-xs text-slate-500 font-medium">8:2 核心攻守模型</p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold">
            診斷良好
          </span>
        </div>

        <div className="space-y-4">
          {pillars.map((p, idx) => {
            const pct = (p.ratio * 100).toFixed(1);
            const isGood = p.status.includes('✅') || p.status.includes('穩健') || p.status.includes('防禦充足');
            return (
              <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{p.title}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`font-extrabold tabular-nums ${p.textColor}`}>{pct}%</span>
                    <span className="text-slate-400 text-[11px]">（目標 {p.target}）</span>
                  </div>
                </div>

                {/* 進度條 */}
                <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, p.ratio * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-slate-500 font-medium tabular-nums">
                    NT$ {Math.round(p.value).toLocaleString()}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    isGood
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>策略哲學：核心長抱複利，衛星控險沙盒</span>
        <span className="text-teal-700 font-bold">攻守平衡</span>
      </div>
    </div>
  );
};
