import React from 'react';
import { TechnicalIndicators } from '../types';
import { Activity, BarChart2, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  data: TechnicalIndicators | null;
}

const IndicatorPanel: React.FC<Props> = ({ data }) => {
  if (!data) return <div className="text-slate-500 text-sm">Initializing Indicators...</div>;

  const getRsiColor = (val: number) => {
    if (val > 70) return 'text-red-400';
    if (val < 30) return 'text-emerald-400';
    return 'text-slate-300';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      {/* RSI */}
      <div className="glass-panel p-3 rounded-lg flex items-center space-x-3">
        <Activity className="w-5 h-5 text-slate-400" />
        <div>
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">RSI (14)</div>
          <div className={`text-lg font-mono font-bold ${getRsiColor(data.rsi)}`}>
            {data.rsi.toFixed(2)}
          </div>
        </div>
      </div>

      {/* MACD */}
      <div className="glass-panel p-3 rounded-lg flex items-center space-x-3">
        <BarChart2 className="w-5 h-5 text-slate-400" />
        <div>
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">MACD Hist</div>
          <div className={`text-lg font-mono font-bold ${data.macd.histogram > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.macd.histogram.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="glass-panel p-3 rounded-lg flex items-center space-x-3">
        {data.trend === 'BULLISH' ? <TrendingUp className="text-emerald-400" /> : <TrendingDown className="text-red-400" />}
        <div>
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Structure</div>
          <div className="text-sm font-bold text-slate-200">{data.trend}</div>
        </div>
      </div>

      {/* Volatility */}
      <div className="glass-panel p-3 rounded-lg flex items-center space-x-3">
        <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center text-[10px] text-slate-400">σ</div>
        <div>
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">ATR (Vol)</div>
          <div className="text-lg font-mono font-bold text-slate-300">{data.volatility.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorPanel;