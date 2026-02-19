import pandas as pd
import numpy as np

def calculate_smi(df: pd.DataFrame, long_len: int = 20, short_len: int = 5, sig_len: int = 5) -> dict:
    """
    Calculates SMI Ergodic (True Strength Index based).
    Pine Script Logic:
    erg = ta.tsi(close, shortlen, longlen)
    sig = ta.ema(erg, siglen)
    """
    close = df['close']
    diff = close.diff()
    
    abs_diff = diff.abs()
    
    # TSI Calculation
    # 1. EMA of momentum (Long)
    ema_diff_long = diff.ewm(span=long_len, adjust=False).mean()
    ema_abs_diff_long = abs_diff.ewm(span=long_len, adjust=False).mean()
    
    # 2. EMA of result (Short)
    ema_diff_short = ema_diff_long.ewm(span=short_len, adjust=False).mean()
    ema_abs_diff_short = ema_abs_diff_long.ewm(span=short_len, adjust=False).mean()
    
    # 3. TSI value
    tsi = (ema_diff_short / ema_abs_diff_short) * 100
    
    # Signal Line
    signal_line = tsi.ewm(span=sig_len, adjust=False).mean()
    
    current_smi = tsi.iloc[-1]
    current_signal = signal_line.iloc[-1]
    
    # Logic: Crossover
    # Bullish: SMI line > Signal Line
    # Bearish: SMI line < Signal Line
    
    return {
        "smi_value": current_smi,
        "signal_value": current_signal,
        "bullish": bool(current_smi > current_signal),
        "bearish": bool(current_smi < current_signal)
    }
