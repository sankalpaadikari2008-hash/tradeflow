import React, { useEffect, useState, useRef } from 'react';
import { AVAILABLE_PAIRS, DEFAULT_PAIR, WS_BASE_URL } from './constants';
import { Candle, TechnicalIndicators, AnalysisResult, CryptoPair, Timeframe, SignalMarker, SignalType } from './types';
import { getIndicators } from './services/taEngine';
import { analyzeMarket } from './services/analysisService';
import CandleChart from './components/CandleChart';
import SignalBox from './components/SignalBox';
import { Activity, CandlestickChart, LineChart, ChevronDown, WifiOff, Wifi } from 'lucide-react';

const MAX_CANDLES = 1000;
const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h'];
// Default to localhost for local dev; in production this should be relative or configured
const API_BASE_URL = 'http://127.0.0.1:8000'; 

function App() {
  const [selectedPair, setSelectedPair] = useState<CryptoPair>(DEFAULT_PAIR);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  
  const [candles, setCandles] = useState<Candle[]>([]);
  const [markers, setMarkers] = useState<SignalMarker[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastPrice, setLastPrice] = useState<number>(0);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const simulationInterval = useRef<number | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- MOCK DATA GENERATOR ---
  const generateMockHistory = (count: number, startPrice: number) => {
    const mockData: Candle[] = [];
    let price = startPrice;
    let time = Date.now() - (count * 60 * 1000); 
    
    for (let i = 0; i < count; i++) {
        const volatility = price * 0.002;
        const change = (Math.random() - 0.5) * volatility;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;
        
        mockData.push({
            time,
            open,
            high,
            low,
            close,
            volume: Math.random() * 1000,
            isClosed: true
        });
        price = close;
        time += 60 * 1000;
    }
    return mockData;
  };

  // --- FETCH HISTORY ---
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setCandles([]); 
    setMarkers([]); 
    setAnalysis(null);

    const fetchHistory = async () => {
      try {
        console.log(`[REST] Fetching history for ${selectedPair.symbol} ${timeframe}...`);
        const response = await fetch(`${API_BASE_URL}/api/history?symbol=${selectedPair.symbol}&interval=${timeframe}`);
        
        if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform backend seconds to milliseconds for frontend
        const formattedCandles: Candle[] = data.map((d: any) => ({
          ...d,
          time: d.time * 1000,
          volume: 0, 
          isClosed: true
        }));

        if (active) {
          console.log(`[REST] Success. Loaded ${formattedCandles.length} candles.`);
          setCandles(formattedCandles);
          if (formattedCandles.length > 0) {
            setLastPrice(formattedCandles[formattedCandles.length - 1].close);
          }
          setIsOffline(false); // Enable LIVE mode
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          console.warn("[REST] API Unreachable or Failed. Switching to Simulation Mode.", err);
          const mock = generateMockHistory(500, 65000);
          setCandles(mock);
          setLastPrice(mock[mock.length-1].close);
          setIsOffline(true); // Enable SIMULATION mode
          setIsLoading(false);
        }
      }
    };

    fetchHistory();

    return () => { active = false; };
  }, [selectedPair, timeframe]);

  // --- WEBSOCKET CONNECTION (LIVE MODE) ---
  useEffect(() => {
    // Only connect if we are NOT in offline/simulation mode and NOT loading history
    if (isOffline || isLoading) {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        return;
    }

    const connect = () => {
        const streamName = `${selectedPair.symbol.toLowerCase()}@kline_${timeframe}`;
        const url = `${WS_BASE_URL}/${streamName}`;
        console.log(`[WS] Connecting: ${url}`);
        
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`[WS] Connected: ${streamName}`);
        };

        ws.onerror = (e) => {
            console.error("[WS] Error:", e);
            // Do NOT switch to offline mode here. Just let it close and retry.
        };

        ws.onclose = () => {
             console.log("[WS] Closed. Attempting reconnect in 3s...");
             wsRef.current = null;
             reconnectTimeout.current = setTimeout(connect, 3000);
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.e === 'kline') {
            const k = message.k;
            const newCandle: Candle = {
              time: k.t, // Binance sends milliseconds
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isClosed: k.x
            };

            setLastPrice(newCandle.close);

            setCandles(prev => {
              if (prev.length === 0) return [newCandle];
              const last = prev[prev.length - 1];
              
              if (last.time === newCandle.time) {
                // Update current candle
                const updated = [...prev];
                updated[updated.length - 1] = newCandle;
                return updated;
              } 
              
              if (newCandle.time > last.time) {
                // New candle
                const newState = [...prev, newCandle];
                return newState.slice(-MAX_CANDLES);
              }

              return prev;
            });
          }
        };
    };

    connect();

    return () => {
        if (wsRef.current) wsRef.current.close();
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [selectedPair, timeframe, isOffline, isLoading]);


  // --- SIMULATION LOOP (OFFLINE MODE) ---
  useEffect(() => {
    if (simulationInterval.current) clearInterval(simulationInterval.current);

    if (isOffline && !isLoading) {
       console.log("[SIM] Starting Simulation Loop...");
       simulationInterval.current = window.setInterval(() => {
          setCandles(prev => {
             if (prev.length === 0) return prev;
             const last = prev[prev.length - 1];
             const now = Date.now();
             
             // Random Walk Logic
             const volatility = last.close * 0.0005; 
             const change = (Math.random() - 0.5) * volatility;
             const newClose = last.close + change;
             const newHigh = Math.max(last.high, newClose);
             const newLow = Math.min(last.low, newClose);
             
             const updatedLast = {
                 ...last,
                 close: newClose,
                 high: newHigh,
                 low: newLow,
                 time: last.time // Keep time same until close
             };
             
             // Close candle every 3 seconds for demo speed
             if (now - last.time > 3000) {
                 return [...prev, {
                     time: now,
                     open: newClose,
                     high: newClose,
                     low: newClose,
                     close: newClose,
                     volume: 0,
                     isClosed: false
                 }].slice(-MAX_CANDLES);
             }
             
             const newData = [...prev];
             newData[newData.length - 1] = updatedLast;
             setLastPrice(newClose);
             return newData;
          });
       }, 200);
    }
    
    return () => {
        if (simulationInterval.current) clearInterval(simulationInterval.current);
    }
  }, [isOffline, isLoading]);


  // --- ANALYSIS ENGINE ---
  useEffect(() => {
    if (candles.length > 20) {
      const calculatedIndicators = getIndicators(candles);
      setIndicators(calculatedIndicators);

      const lastCandle = candles[candles.length - 1];
      // Debounce analysis
      if ((lastCandle.isClosed || isOffline) && !isAnalyzing) {
        // In offline mode, analyze more frequently
        const shouldAnalyze = isOffline ? Math.random() > 0.8 : lastCandle.isClosed;
        
        if (shouldAnalyze) {
            setIsAnalyzing(true);
            // Non-blocking analysis
            analyzeMarket(calculatedIndicators, lastCandle).then(result => {
                setAnalysis(result);
                setIsAnalyzing(false);
            });
        }
      }
    }
  }, [candles, isOffline]);

  // --- MARKERS ---
  useEffect(() => {
     if (analysis && (analysis.signal === SignalType.STRONG_BUY || analysis.signal === SignalType.STRONG_SELL)) {
         if (candles.length > 0) {
            const candleTime = candles[candles.length - 1].time;
            setMarkers(prev => {
                // Avoid duplicate markers for same timestamp
                if (prev.some(m => m.time === candleTime)) return prev;
                return [...prev, { time: candleTime, type: analysis.signal }];
            });
         }
     }
  }, [analysis]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col">
      <header className="px-6 py-4 border-b border-slate-800/50 bg-[#020617]/95 backdrop-blur z-50 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">QUANT<span className="text-cyan-400">FLOW</span></span>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded text-sm font-medium transition-colors">
              {selectedPair.name} <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
               {AVAILABLE_PAIRS.map(pair => (
                  <button 
                    key={pair.symbol}
                    onClick={() => setSelectedPair(pair)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-800 ${selectedPair.symbol === pair.symbol ? 'text-cyan-400' : 'text-slate-400'}`}
                  >
                    {pair.name}
                  </button>
               ))}
            </div>
          </div>
          <div className="w-px h-4 bg-slate-800" />
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${timeframe === tf ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-slate-800" />
          <div className="flex items-center bg-slate-950 rounded p-0.5">
             <button onClick={() => setChartType('candle')} className={`p-1.5 rounded ${chartType === 'candle' ? 'bg-slate-700 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                <CandlestickChart className="w-4 h-4" />
             </button>
             <button onClick={() => setChartType('line')} className={`p-1.5 rounded ${chartType === 'line' ? 'bg-slate-700 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                <LineChart className="w-4 h-4" />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-[500px]">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
               <h2 className="text-4xl font-bold text-white tracking-tighter">
                  {lastPrice > 0 ? lastPrice.toFixed(2) : '---.--'}
               </h2>
               <span className="text-sm font-medium text-slate-500">USD</span>
            </div>
            <div className="flex items-center gap-2">
                {isOffline ? (
                   <>
                    <WifiOff className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-mono uppercase text-amber-500">SIMULATION MODE</span>
                   </>
                ) : (
                    <>
                    <Wifi className={`w-4 h-4 ${isLoading ? 'text-yellow-500 animate-pulse' : 'text-emerald-500'}`} />
                    <span className={`text-xs font-mono uppercase ${isLoading ? 'text-yellow-500' : 'text-emerald-500'}`}>
                       {isLoading ? 'Loading History...' : 'Live Feed (Binance)'}
                    </span>
                    </>
                )}
            </div>
          </div>
          <div className="flex-1 glass-panel rounded-xl border border-slate-800/50 p-1 relative overflow-hidden group">
             <CandleChart data={candles} chartType={chartType} markers={markers} />
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
           <div className="flex-1 max-h-[300px]">
              <SignalBox analysis={analysis} isAnalyzing={isAnalyzing} />
           </div>
           <div className="glass-panel p-6 rounded-xl border border-slate-800/50 flex-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Market Conditions</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                    <span className="text-sm text-slate-400">Trend Strength</span>
                    <span className="text-sm font-medium text-white">
                        {indicators?.trend === 'BULLISH' ? 'Uptrend' : indicators?.trend === 'BEARISH' ? 'Downtrend' : 'Consolidating'}
                    </span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                    <span className="text-sm text-slate-400">Volatility</span>
                    <span className="text-sm font-medium text-white">
                        {indicators ? (indicators.volatility / lastPrice * 1000).toFixed(1) : '-'} <span className="text-slate-600 text-xs">IDX</span>
                    </span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                    <span className="text-sm text-slate-400">Market Phase</span>
                    <span className="text-sm font-medium text-white">
                       {indicators?.rsi && indicators.rsi > 70 ? 'Overextended' : indicators?.rsi && indicators.rsi < 30 ? 'Oversold' : 'Balanced'}
                    </span>
                 </div>
              </div>
              <div className="mt-8 p-4 bg-blue-500/5 rounded border border-blue-500/10">
                 <p className="text-xs text-blue-300/80 leading-relaxed text-center">
                    Quantitative algorithms are continuously scanning for high-probability setups based on multi-timeframe structure.
                 </p>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

export default App;