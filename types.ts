export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export enum SignalType {
  STRONG_BUY = "STRONG_BUY",
  STRONG_SELL = "STRONG_SELL",
  NEUTRAL = "NEUTRAL",
  WAITING = "WAITING"
}

export interface SignalMarker {
  time: number; // UNIX ms
  type: SignalType;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  aroon: {
    up: number;
    down: number;
  };
  smi: {
    value: number; // SMI Ergodic value
    signal: number;
  };
  volatility: number; // ATR
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
}

export interface AnalysisResult {
  signal: SignalType;
  confidence: number;
  reasoning: string;
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h';

export interface CryptoPair {
  symbol: string;
  name: string;
}