import pandas as pd
import numpy as np

def calculate_ut_bot(df: pd.DataFrame, key_value: float = 1.0, atr_period: int = 10) -> dict:
    """
    Calculates UT Bot Alerts logic.
    Pine Script Logic:
    xATR = atr(c)
    nLoss = a * xATR
    xATRTrailingStop calculation (recursive)
    """
    close = df['close']
    high = df['high']
    low = df['low']
    
    # 1. Calculate ATR
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # Pine 'atr' is usually RMA (Wilder's), but standard is SMA in some libs. 
    # Pine defaults to RMA.
    atr = tr.ewm(alpha=1/atr_period, adjust=False).mean()
    
    n_loss = key_value * atr
    
    # 2. Calculate Trailing Stop (Iterative)
    # This requires statefulness relative to previous candle
    src = close
    
    traj_stop = np.zeros(len(close))
    
    # We must iterate to replicate Pine's recursive 'nz(xATRTrailingStop[1])'
    # Optimize by using numpy arrays
    src_vals = src.values
    n_loss_vals = n_loss.values
    
    for i in range(1, len(src_vals)):
        prev_stop = traj_stop[i-1]
        price = src_vals[i]
        prev_price = src_vals[i-1]
        loss = n_loss_vals[i]
        
        if (prev_price > prev_stop) and (price > prev_stop):
            traj_stop[i] = max(prev_stop, price - loss)
        elif (prev_price < prev_stop) and (price < prev_stop):
            traj_stop[i] = min(prev_stop, price + loss)
        elif price > prev_stop:
            traj_stop[i] = price - loss
        else:
            traj_stop[i] = price + loss
            
    # 3. Determine Position
    # pos := src[1] < prev_stop and src > prev_stop ? 1 : ...
    
    position = np.zeros(len(close)) # 1 for Buy, -1 for Sell
    
    for i in range(1, len(close)):
        prev_pos = position[i-1]
        price = src_vals[i]
        prev_price = src_vals[i-1]
        stop = traj_stop[i-1] # Pine uses [1] for comparison in 'iff'
        
        # Pine logic:
        # iff(src[1] < nz(xATRTrailingStop[1], 0) and src > nz(xATRTrailingStop[1], 0), 1,
        # iff(src[1] > nz(xATRTrailingStop[1], 0) and src < nz(xATRTrailingStop[1], 0), -1, nz(pos[1], 0))) 
        
        if prev_price < stop and price > stop:
            position[i] = 1
        elif prev_price > stop and price < stop:
            position[i] = -1
        else:
            position[i] = prev_pos

    current_pos = position[-1]
    
    return {
        "value": traj_stop[-1],
        "bullish": bool(current_pos == 1),
        "bearish": bool(current_pos == -1)
    }
