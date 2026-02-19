import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, Time, SeriesMarker } from 'lightweight-charts';
import { Candle, SignalType, SignalMarker } from '../types';

interface CandleChartProps {
  data: Candle[];
  chartType: 'candle' | 'line';
  markers?: SignalMarker[];
}

const CandleChart: React.FC<CandleChartProps> = ({ data, chartType, markers = [] }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null>(null);
  const lastDataLengthRef = useRef<number>(0);

  // 1. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#020617' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500, // Fixed height for stability
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#334155',
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // 2. Manage Series
  useEffect(() => {
    if (!chartRef.current) return;
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    let series: ISeriesApi<"Candlestick"> | ISeriesApi<"Area">;
    if (chartType === 'line') {
      series = chartRef.current.addAreaSeries({
        lineColor: '#22d3ee',
        topColor: 'rgba(34, 211, 238, 0.4)',
        bottomColor: 'rgba(34, 211, 238, 0.0)',
        lineWidth: 2,
      });
    } else {
      series = chartRef.current.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
    }
    seriesRef.current = series;
    
    // Force reset data length tracking on series recreate
    lastDataLengthRef.current = 0;
  }, [chartType]);

  // 3. Update Data (The Fix)
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const format = (d: Candle) => ({
        time: (d.time / 1000) as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        value: d.close
    });

    // CRITICAL FIX: Determine if this is a "History Load" or "Realtime Update"
    // History Load: data length increased significantly OR length is 0->many
    // Update: data length same (candle update) OR +1 (new candle)
    const isHistoryLoad = data.length > lastDataLengthRef.current + 2 || lastDataLengthRef.current === 0;

    if (isHistoryLoad) {
        // Full Set Data
        const uniqueData = data.map(format)
            .sort((a, b) => (a.time as number) - (b.time as number))
            .filter((v, i, a) => a.findIndex(t => t.time === v.time) === i); // Dedupe
        
        seriesRef.current.setData(uniqueData);
        chartRef.current?.timeScale().fitContent();
    } else {
        // Incremental Update
        const lastCandle = data[data.length - 1];
        try {
            seriesRef.current.update(format(lastCandle));
        } catch (e) {
            // Safety fallback
            const uniqueData = data.map(format)
                .sort((a, b) => (a.time as number) - (b.time as number))
                .filter((v, i, a) => a.findIndex(t => t.time === v.time) === i);
            seriesRef.current.setData(uniqueData);
        }
    }
    
    lastDataLengthRef.current = data.length;

  }, [data]);

  // 4. Markers
  useEffect(() => {
    if (!seriesRef.current || !markers) return;
    const lwcMarkers: SeriesMarker<Time>[] = markers
      .filter(m => m.type === SignalType.STRONG_BUY || m.type === SignalType.STRONG_SELL)
      .map(m => ({
        time: (m.time / 1000) as Time,
        position: 'aboveBar',
        color: '#FFD700',
        shape: 'circle',
        size: 0.5
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    seriesRef.current.setMarkers(lwcMarkers);
  }, [markers]);

  return (
    <div ref={chartContainerRef} className="w-full h-full min-h-[500px]" />
  );
};

export default CandleChart;