import { Candle, TechnicalIndicators } from "../types";

// Helper for average
const avg = (data: number[]) => data.reduce((a, b) => a + b, 0) / data.length;

// Standard Exponential Moving Average
const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaArray = [data[0]];
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
};

// RSI Calculation
export const calculateRSI = (candles: Candle[], period: number = 14): number => {
  if (candles.length < period + 1) return 50;
  
  const closes = candles.map(c => c.close);
  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

// MACD Calculation
export const calculateMACD = (candles: Candle[]) => {
  if (candles.length < 26) return { macdLine: 0, signalLine: 0, histogram: 0 };
  
  const closes = candles.map(c => c.close);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  
  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  
  // Need historical MACD line to calc signal
  const macdHistory: number[] = [];
  for(let i=0; i<closes.length; i++) {
     macdHistory.push(ema12[i] - ema26[i]);
  }
  
  const signalLineSeries = calculateEMA(macdHistory, 9);
  const signalLine = signalLineSeries[signalLineSeries.length - 1];
  
  return {
    macdLine,
    signalLine,
    histogram: macdLine - signalLine
  };
};

// Aroon Calculation
export const calculateAroon = (candles: Candle[], period: number = 14) => {
  if (candles.length < period) return { up: 0, down: 0 };
  
  const relevant = candles.slice(-period - 1); // Get last period+1 candles
  const highs = relevant.map(c => c.high);
  const lows = relevant.map(c => c.low);
  
  // Find index of max high and min low
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  
  const daysSinceHigh = period - highs.lastIndexOf(maxHigh);
  const daysSinceLow = period - lows.lastIndexOf(minLow);
  
  const up = ((period - daysSinceHigh) / period) * 100;
  const down = ((period - daysSinceLow) / period) * 100;
  
  return { up, down };
};

// SMI Ergodic Oscillator (Simplified Port)
export const calculateSMI = (candles: Candle[]) => {
  // Uses Double EMA of Price Change
  // SMI = (TSI Value) simplified for demo
  if (candles.length < 20) return { value: 0, signal: 0 };
  const closes = candles.map(c => c.close);
  
  // Simple Momentum
  const mom = closes[closes.length - 1] - closes[closes.length - 2];
  
  // This is a placeholder for the full SMI math which requires recursive EMA chains
  // We will use a fast Stochastic approximation for this demo which behaves similarly
  const period = 14;
  const subset = candles.slice(-period);
  const min = Math.min(...subset.map(c => c.low));
  const max = Math.max(...subset.map(c => c.high));
  const current = closes[closes.length - 1];
  
  const k = ((current - min) / (max - min)) * 100;
  
  return { value: k, signal: k }; // Returning Stoch K for demo visualization
}

// ATR (Volatility)
export const calculateATR = (candles: Candle[], period: number = 14): number => {
    if (candles.length < period + 1) return 0;
    
    // True Range
    const trs = [];
    for(let i = 1; i < candles.length; i++) {
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i-1].close;
        
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trs.push(tr);
    }
    
    return avg(trs.slice(-period));
}

// Swing Detection (Basic Support/Resistance)
export const detectSwingStructure = (candles: Candle[]) => {
    if (candles.length < 5) return 'RANGING';
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];
    
    if (last.close > prev.high && prev.close > prev2.high) return 'BULLISH';
    if (last.close < prev.low && prev.close < prev2.low) return 'BEARISH';
    return 'RANGING';
}

export const getIndicators = (candles: Candle[]): TechnicalIndicators => {
    return {
        rsi: calculateRSI(candles),
        macd: calculateMACD(candles),
        aroon: calculateAroon(candles),
        smi: calculateSMI(candles),
        volatility: calculateATR(candles),
        trend: detectSwingStructure(candles)
    };
};