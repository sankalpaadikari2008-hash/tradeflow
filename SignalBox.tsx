import React from 'react';
import { AnalysisResult, SignalType } from '../types';
import { Radar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Props {
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
}

const SignalBox: React.FC<Props> = ({ analysis, isAnalyzing }) => {
  // Determine if we have a valid actionable signal
  const hasSignal = analysis && (analysis.signal === SignalType.STRONG_BUY || analysis.signal === SignalType.STRONG_SELL);
  
  // If analyzing OR no strong signal yet (Neutral/Waiting), show scanning state
  const showScanning = isAnalyzing || !hasSignal;

  if (showScanning) {
    return (
      <div className="w-full h-full min-h-[160px] glass-panel rounded-xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50" />
        
        {/* Scanning Animation */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full border border-slate-700 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 animate-pulse flex items-center justify-center">
               <Radar className="w-6 h-6 text-cyan-400 animate-[spin_3s_linear_infinite]" />
            </div>
          </div>
          <div className="absolute inset-0 border-t-2 border-cyan-500/30 rounded-full animate-spin"></div>
        </div>

        <h3 className="text-sm font-medium text-slate-300 relative z-10 animate-pulse">
          Analyzing charts...
        </h3>
        <p className="text-xs text-slate-500 mt-2 relative z-10">
          Finding best confirmation
        </p>
      </div>
    );
  }

  // Display Signal
  const isBuy = analysis?.signal === SignalType.STRONG_BUY;
  const timestamp = analysis ? new Date(analysis.timestamp).toLocaleTimeString() : '--:--';

  return (
    <div className={`w-full h-full min-h-[160px] rounded-xl p-6 relative overflow-hidden flex flex-col items-center justify-center border transition-all duration-700 ${isBuy ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-red-950/20 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]'}`}>
      
      <div className="flex items-center gap-3 mb-4 animate-[fadeIn_0.5s_ease-out]">
        {isBuy ? (
          <ArrowUpCircle className="w-10 h-10 text-emerald-400" />
        ) : (
          <ArrowDownCircle className="w-10 h-10 text-red-400" />
        )}
        <span className={`text-2xl font-black tracking-tighter ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
          {isBuy ? 'STRONG BUY' : 'STRONG SELL'}
        </span>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800">
        <div className={`w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          Signal Time: {timestamp}
        </span>
      </div>

    </div>
  );
};

export default SignalBox;