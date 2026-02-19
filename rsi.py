import pandas as pd
import numpy as np

def calculate_rsi(df: pd.DataFrame, length: int = 14) -> dict:
    """
    Calculates RSI using Wilder's Smoothing (RMA).
    Pine Script Logic:
    up = rma(max(change, 0), length)
    down = rma(-min(change, 0), length)
    rsi = 100 - (100 / (1 + up / down))
    """
    delta = df['close'].diff()
    
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    
    # Wilder's Smoothing (RMA) is equivalent to EWM with alpha = 1/length
    alpha = 1 / length
    ma_up = up.ewm(alpha=alpha, adjust=False).mean()
    ma_down = down.ewm(alpha=alpha, adjust=False).mean()
    
    rs = ma_up / ma_down
    rsi = 100 - (100 / (1 + rs))
    
    current_rsi = rsi.iloc[-1]
    
    # Signal Logic based on Momentum/Trend
    # Standard: > 50 is Bullish Trend, < 50 is Bearish Trend
    # For "Signals" specifically requested (Strong Buy/Sell), often <30/>70 is used,
    # but to satisfy "All indicators same direction", we usually treat 50 as the midline.
    
    return {
        "value": current_rsi,
        "bullish": bool(current_rsi > 50),
        "bearish": bool(current_rsi < 50)
    }
