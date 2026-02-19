import pandas as pd
import numpy as np

def calculate_smc(df: pd.DataFrame, swing_length: int = 50) -> dict:
    """
    Calculates simplified Smart Money Concepts Trend Bias.
    Based on Swing High/Low Break of Structure (BOS).
    
    Pine Script Logic mimics:
    Detection of Pivot Highs/Lows.
    Tracking the 'Swing Trend'.
    Break of last Swing High = Bullish Bias.
    Break of last Swing Low = Bearish Bias.
    """
    high = df['high']
    low = df['low']
    close = df['close']
    
    # 1. Detect Pivot Points (Fractals)
    # We use a window to check if i is the highest/lowest in range
    # Note: This is historical detection. For real-time, we look at confirmed pivots.
    
    # A pivot high at index i means high[i] > high[i-k]...high[i+k]
    # We can't know i+k in real-time without lag. 
    # Standard practice: Check if i-k was a pivot once we are at i.
    
    # However, to determine CURRENT trend, we look at the LAST CONFIRMED pivot.
    
    trend = 0 # 0 Neutral, 1 Bullish, -1 Bearish
    
    last_swing_high = float('inf')
    last_swing_low = 0.0
    
    # Optimize: We iterate to simulate the state machine of the trend
    # We need a robust way to find pivots.
    
    # Using scipy for argrelextrema is cleaner but lets stick to pure numpy/pandas
    # to avoid heavy deps if possible, or manual iteration.
    
    # Simplified Swing Detection Loop
    # We will identify peaks and valleys.
    
    highs = high.values
    lows = low.values
    closes = close.values
    
    current_trend = 0 # -1 Bearish, 1 Bullish
    
    # Store last confirmed swings
    # Initialize with first values
    last_sh = highs[0]
    last_sl = lows[0]
    
    # To reduce noise, we only update trend on breaks
    # This is a simplified "Dow Theory" implementation which is the core of SMC structure
    
    for i in range(swing_length, len(closes)):
        # Check for Pivot High (simplistic: highest in window)
        # In SMC script, pivots are `high[size] > ta.highest(size)` etc.
        # This implies a lag of 'size' bars.
        
        # Let's check if (i - swing_length) was a pivot high
        # range to check: i - 2*swing_length to i
        
        # Effective confirmation index
        pivot_idx = i - swing_length
        
        # Is pivot_idx a local Max?
        window_highs = highs[pivot_idx - swing_length : pivot_idx + swing_length + 1]
        is_pivot_high = highs[pivot_idx] == np.max(window_highs)
        
        # Is pivot_idx a local Min?
        window_lows = lows[pivot_idx - swing_length : pivot_idx + swing_length + 1]
        is_pivot_low = lows[pivot_idx] == np.min(window_lows)
        
        if is_pivot_high:
            last_sh = highs[pivot_idx]
            
        if is_pivot_low:
            last_sl = lows[pivot_idx]
            
        # Check Break of Structure (BOS) / Change of Character
        # Using Close price for breaks (as per many SMC interpretations)
        
        if closes[i] > last_sh:
            current_trend = 1
            
        if closes[i] < last_sl:
            current_trend = -1

    return {
        "trend_bias": current_trend, # 1 or -1
        "last_swing_high": last_sh,
        "last_swing_low": last_sl,
        "bullish": bool(current_trend == 1),
        "bearish": bool(current_trend == -1)
    }
