import { TechnicalIndicators, AnalysisResult, SignalType, Candle } from "../types";

/**
 * Quantitative Signal Analysis Engine
 * Purely deterministic algorithms based on Technical Analysis confluence.
 */
export const analyzeMarket = async (
  indicators: TechnicalIndicators,
  lastCandle: Candle
): Promise<AnalysisResult> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 300));

  let signal = SignalType.NEUTRAL;
  let confidence = 0;
  let reasoning = "Monitoring market structure.";

  // --- 1. EXTRACT METRICS ---
  const rsi = indicators.rsi;
  const macdHist = indicators.macd.histogram;
  const trend = indicators.trend; // BULLISH, BEARISH, RANGING
  const volatility = indicators.volatility;
  
  // SMI / Stochastic proxy
  const smiVal = indicators.smi.value;
  const smiSig = indicators.smi.signal;

  // --- 2. DEFINE CONDITIONS ---

  // Bullish Confluence
  const rsiOversold = rsi < 45; // Broadened slightly for reaction speed
  const macdTurningUp = macdHist > 0;
  const structureBullish = trend === 'BULLISH';
  const smiCrossoverUp = smiVal > smiSig && smiVal < -20; // Oversold crossover

  // Bearish Confluence
  const rsiOverbought = rsi > 55;
  const macdTurningDown = macdHist < 0;
  const structureBearish = trend === 'BEARISH';
  const smiCrossoverDown = smiVal < smiSig && smiVal > 20; // Overbought crossover

  // --- 3. SIGNAL LOGIC ---

  if (structureBullish && macdTurningUp) {
    // Potential Buy
    if (rsiOversold || smiCrossoverUp) {
      signal = SignalType.STRONG_BUY;
      confidence = 82;
      reasoning = "STRONG BUY: Bullish Market Structure + Momentum Shift. RSI/SMI confirms entry zone.";
      
      if (rsi < 30) { confidence += 8; reasoning += " (Deep Oversold)"; }
    } else {
       reasoning = "Bullish Trend detected, but waiting for optimal entry (Dip).";
       confidence = 60;
    }
  } else if (structureBearish && macdTurningDown) {
    // Potential Sell
    if (rsiOverbought || smiCrossoverDown) {
      signal = SignalType.STRONG_SELL;
      confidence = 82;
      reasoning = "STRONG SELL: Bearish Market Structure + Momentum Shift. RSI/SMI confirms entry zone.";
      
      if (rsi > 70) { confidence += 8; reasoning += " (Deep Overbought)"; }
    } else {
       reasoning = "Bearish Trend detected, but waiting for optimal entry (Rally).";
       confidence = 60;
    }
  } else {
    // Ranging or Mixed
    reasoning = `Market is ${trend.toLowerCase()}. Indicators are mixed. Waiting for clear structure break.`;
    confidence = 40;
  }

  // --- 4. RISK PARAMETERS (ATR) ---
  let stopLoss = 0;
  let takeProfit = 0;
  const currentPrice = lastCandle.close;

  if (signal === SignalType.STRONG_BUY) {
    stopLoss = currentPrice - (volatility * 2.0);
    takeProfit = currentPrice + (volatility * 4.0);
  } else if (signal === SignalType.STRONG_SELL) {
    stopLoss = currentPrice + (volatility * 2.0);
    takeProfit = currentPrice - (volatility * 4.0);
  } else {
    stopLoss = currentPrice * 0.98;
    takeProfit = currentPrice * 1.02;
  }

  return {
    signal,
    confidence: Math.min(confidence, 99),
    reasoning,
    stopLoss,
    takeProfit,
    timestamp: Date.now()
  };
};