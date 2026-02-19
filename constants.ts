import { CryptoPair } from "./types";

export const AVAILABLE_PAIRS: CryptoPair[] = [
  { symbol: 'btcusdt', name: 'BTC/USDT' },
  { symbol: 'ethusdt', name: 'ETH/USDT' },
  { symbol: 'solusdt', name: 'SOL/USDT' },
  { symbol: 'bnbusdt', name: 'BNB/USDT' },
  { symbol: 'xrbusdt', name: 'XRP/USDT' },
];

export const WS_BASE_URL = 'wss://stream.binance.com:9443/ws';

// Thresholds for indicators
export const RSI_OVERBOUGHT = 70;
export const RSI_OVERSOLD = 30;
export const CONFIDENCE_THRESHOLD = 75;

export const DEFAULT_PAIR = AVAILABLE_PAIRS[0]; // BTC