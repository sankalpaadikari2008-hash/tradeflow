from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "QuantFlow AI API is running"}

@app.get("/api/history")
async def get_history(symbol: str = Query(..., description="Symbol like btcusdt"), interval: str = Query(..., description="1m, 5m, 1h")):
    """
    Fetches historical klines from Binance and formats them for the frontend.
    Returns 500 candles.
    """
    # Binance REST API requires uppercase symbols (e.g. BTCUSDT)
    formatted_symbol = symbol.upper()
    
    # Binance API URL
    url = "https://api.binance.com/api/v3/klines"
    
    params = {
        "symbol": formatted_symbol,
        "interval": interval,
        "limit": 500
    }
    
    print(f"[BACKEND] Fetching history: {formatted_symbol} {interval}")

    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Transform Binance data [Open Time, Open, High, Low, Close, ...] 
            # to { time (seconds), open, high, low, close }
            candles = []
            for k in data:
                candles.append({
                    "time": int(k[0] / 1000), # Convert ms to seconds for consistency with Lightweight Charts
                    "open": float(k[1]),
                    "high": float(k[2]),
                    "low": float(k[3]),
                    "close": float(k[4])
                })
            
            # Sort oldest to newest (Binance usually returns sorted, but ensuring safety)
            candles.sort(key=lambda x: x["time"])
            
            print(f"[BACKEND] Success. Returned {len(candles)} candles.")
            return candles
            
        except httpx.HTTPStatusError as e:
            print(f"[BACKEND] HTTP Error: {e}")
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            print(f"[BACKEND] General Error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Allow external access if running in container
    uvicorn.run(app, host="0.0.0.0", port=8000)
