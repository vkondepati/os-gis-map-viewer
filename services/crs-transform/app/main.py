from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from pyproj import Transformer

app = FastAPI(title="CRS Transform Service", version="0.1.0")

@app.get("/docs/health")
def health():
    return {"status":"ok"}

@app.get("/transform")
def transform(coords: str = Query(..., description="lon,lat|lon,lat|..."),
              from_crs: str = Query("EPSG:4326", alias="from"),
              to_crs: str = Query("EPSG:3857", alias="to")):
    transformer = Transformer.from_crs(from_crs, to_crs, always_xy=True)
    pairs = [c.split(',') for c in coords.split('|')]
    lons = [float(p[0]) for p in pairs]
    lats = [float(p[1]) for p in pairs]
    x, y = transformer.transform(lons, lats)
    out = list(zip(x, y))
    return JSONResponse({ "from": from_crs, "to": to_crs, "coords": out })
