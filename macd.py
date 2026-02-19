import pandas as pd
import numpy as np

def calculate_macd(df: pd.DataFrame, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> dict:
    """
    Calculates MACD and Signal Line.
    Pine Script Logic:
    fastMA = ema(close, fastLength)
    slowMA = ema(close, slowLength)
    macd = fastMA - slowMA
    signal = sma(macd, signalLength)
    """
    close = df['close']
    
    # Calculate EMAs
    ema_fast = close.ewm(span=fast_period, adjust=False).mean()
    ema_slow = close.ewm(span=slow_period, adjust=False).mean()
    
    macd_line = ema_fast - ema_slow
    
    # Signal line is usually EMA of MACD, but Pine Script in prompt said 'sma(macd, signalLength)'
    # However, standard MACD uses EMA for signal. 
    # Checking file text: "signal = sma(macd, signalLength)" -> OK, we use SMA as per file.
    signal_line = macd_line.rolling(window=signal_period).mean()
    
    histogram = macd_line - signal_line
    
    current_macd = macd_line.iloc[-1]
    current_signal = signal_line.iloc[-1]
    current_hist = histogram.iloc[-1]
    prev_hist = histogram.iloc[-2] if len(histogram) > 1 else 0

    # Logic from "MACD 4 Color":
    # Bullish if MACD > Signal (Histogram > 0)
    # Bearish if MACD < Signal (Histogram < 0)
    
    # 4-Color logic implies momentum strength (Histogram growing/shrinking), 
    # but strictly for signals we check the crossover state.
    
    is_bullish = current_macd > current_signal
    is_bearish = current_macd < current_signal
    
    return {
        "macd": current_macd,
        "signal_line": current_signal,
        "histogram": current_hist,
        "bullish": bool(is_bullish),
        "bearish": bool(is_bearish)
    }
