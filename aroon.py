import pandas as pd
import numpy as np

def calculate_aroon(df: pd.DataFrame, length: int = 14) -> dict:
    """
    Calculates Aroon Oscillator.
    Pine Script Logic:
    [aroonUp, aroonDn] = TVta.aroon(length)
    osc = aroonUp - aroonDn
    """
    high = df['high']
    low = df['low']
    
    # Calculate periods since last high/low
    # Rolling apply is used to find the index (argmax/argmin) relative to the window
    
    def argmax_rows(x):
        return (len(x) - 1) - np.argmax(x)

    def argmin_rows(x):
        return (len(x) - 1) - np.argmin(x)

    # periods + 1 because we need 'length' periods looking back
    days_since_high = high.rolling(window=length + 1).apply(argmax_rows, raw=True)
    days_since_low = low.rolling(window=length + 1).apply(argmin_rows, raw=True)

    aroon_up = ((length - days_since_high) / length) * 100
    aroon_down = ((length - days_since_low) / length) * 100
    
    oscillator = aroon_up - aroon_down

    # Get the latest closed candle value
    current_osc = oscillator.iloc[-1]
    
    # Logic: 
    # Bullish if Oscillator > 0
    # Bearish if Oscillator < 0
    
    return {
        "value": current_osc,
        "bullish": bool(current_osc > 0),
        "bearish": bool(current_osc < 0),
        "aroon_up": aroon_up.iloc[-1],
        "aroon_down": aroon_down.iloc[-1]
    }
