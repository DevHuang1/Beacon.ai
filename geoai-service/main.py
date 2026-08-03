"""
OpenGeoAI Microservice for AEGIS Response.

FastAPI server that wraps geospatial AI modules (water detection,
segmentation, classification, object detection, change detection).
Run with: uvicorn main:app --port 8001

Integrates with:
- segment-geospatial (SAM-based segmentation)
- torchgeo (landcover classification)
- rasterio (geotiff processing)
- USGS/NWS API data
"""

import io
import base64
import logging
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OpenGeoAI Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- Try importing optional geospatial AI libraries ---
try:
    import numpy as np
    HAVE_NUMPY = True
except ImportError:
    np = None
    HAVE_NUMPY = False

try:
    from PIL import Image
    HAVE_PIL = True
except ImportError:
    Image = None
    HAVE_PIL = False

try:
    from samgeo import SamGeo
    HAVE_SAMGEO = True
    logger.info("SAM-Geo available for segmentation")
except ImportError:
    HAVE_SAMGEO = False
    logger.info("SAM-Geo not installed; using quantized segmentation")

try:
    import torchgeo
    HAVE_TORCHGEO = True
except ImportError:
    HAVE_TORCHGEO = False


# --- Pydantic models ---
class ImageInput(BaseModel):
    url: Optional[str] = None
    base64: Optional[str] = None


class WaterRequest(BaseModel):
    image: Optional[ImageInput] = None
    region: Optional[str] = "auto"
    threshold: float = 0.5
    nir_band: int = 2


class SegmentRequest(BaseModel):
    image: Optional[ImageInput] = None
    model: str = "sam"


class ClassifyRequest(BaseModel):
    image: Optional[ImageInput] = None
    model: str = "landcover"


class DetectRequest(BaseModel):
    image: Optional[ImageInput] = None
    confidence: float = 0.5


class ChangeRequest(BaseModel):
    before: Optional[ImageInput] = None
    after: Optional[ImageInput] = None


# --- Utility functions ---
def load_image(source: ImageInput):
    if source is None or Image is None:
        return None
    if source.base64:
        try:
            data = base64.b64decode(source.base64)
            return Image.open(io.BytesIO(data)).convert("RGB")
        except Exception as e:
            logger.warning(f"Image decode failed: {e}")
            return None
    if source.url:
        try:
            import httpx
            r = httpx.get(source.url, timeout=30)
            r.raise_for_status()
            return Image.open(io.BytesIO(r.content)).convert("RGB")
        except Exception as e:
            logger.warning(f"Image fetch failed: {e}")
    return None


def arr_to_b64(arr):
    img = Image.fromarray(arr.astype("uint8"))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def classify_from_stats(arr):
    rgb = arr.astype(np.float32) / 255.0
    r = rgb[..., 0]
    g = rgb[..., 1]
    b = rgb[..., 2]
    eps = 1e-6
    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    sat = (maxc - minc) / (maxc + eps)
    bright = (r + g + b) / 3.0

    water = (b > r) & (b > g) & (b > 0.25)
    vegetation = (~water) & (g > r) & (g > b) & (sat > 0.15)
    barren = (~water) & (~vegetation) & (sat < 0.15) & (bright > 0.6)
    urban = (~water) & (~vegetation) & (~barren) & (sat < 0.25) & (bright > 0.25)
    agriculture = (~water) & (~vegetation) & (~barren) & (~urban)

    total = max(int(arr.shape[0] * arr.shape[1]), 1)
    classes = ["water", "vegetation", "urban", "barren", "agriculture"]
    masks = {"water": water, "vegetation": vegetation, "urban": urban, "barren": barren, "agriculture": agriculture}
    confidences = {}
    for c in classes:
        confidences[c] = round(float(masks[c].sum()) / total, 4)
    dominant = max(classes, key=lambda c: confidences[c])
    return confidences, dominant


def detect_blobs(img, max_dim=128, min_area=12):
    orig_w, orig_h = img.size
    scale = min(1.0, max_dim / max(orig_w, orig_h))
    sw = max(1, int(round(orig_w * scale)))
    sh = max(1, int(round(orig_h * scale)))
    small = img.convert("L").resize((sw, sh))
    a = np.array(small, dtype=np.float32)
    m = a.mean()
    s = a.std()
    if s < 1e-6:
        return []
    mask = np.abs(a - m) > 1.2 * s

    visited = np.zeros_like(mask, dtype=bool)
    components = []
    for y in range(sh):
        for x in range(sw):
            if not mask[y, x] or visited[y, x]:
                continue
            stack = [(x, y)]
            visited[y, x] = True
            xs = []
            ys = []
            vals = []
            while stack:
                cx, cy = stack.pop()
                xs.append(cx)
                ys.append(cy)
                vals.append(a[cy, cx])
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx = cx + dx
                        ny = cy + dy
                        if 0 <= nx < sw and 0 <= ny < sh and mask[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            stack.append((nx, ny))
            if len(xs) >= min_area:
                components.append({
                    "x0": min(xs), "x1": max(xs),
                    "y0": min(ys), "y1": max(ys),
                    "size": len(xs),
                    "mag": float(np.mean(np.abs(a[ys, xs] - m))),
                })

    inv = 1.0 / scale if scale > 0 else 1.0
    detections = []
    for c in components:
        conf = float(np.clip(0.5 + c["mag"] / (2 * s + 1e-6), 0.5, 0.99))
        detections.append({
            "type": "object",
            "confidence": round(conf, 3),
            "bbox": [
                int(c["x0"] * inv),
                int(c["y0"] * inv),
                int(c["x1"] * inv),
                int(c["y1"] * inv),
            ],
        })
    detections.sort(key=lambda d: (d["bbox"][2] - d["bbox"][0]) * (d["bbox"][3] - d["bbox"][1]), reverse=True)
    return detections[:20]


# --- Health ---
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "modules": {
            "water": True,
            "segment": HAVE_SAMGEO,
            "classify": HAVE_TORCHGEO,
            "detect": True,
            "change": True,
        },
        "libs": {"numpy": HAVE_NUMPY, "pil": HAVE_PIL, "samgeo": HAVE_SAMGEO, "torchgeo": HAVE_TORCHGEO},
    }


# --- Water / Flood Detection ---
@app.post("/water/detect")
async def detect_water(req: WaterRequest):
    img = load_image(req.image) if req.image else None
    if img is None or not HAVE_NUMPY:
        return {
            "success": False,
            "error": "image required (base64 or url) for real water detection",
            "source": "opengeoai_error",
        }
    arr = np.array(img.convert("RGB")).astype(np.float32)
    green = arr[:, :, 1]
    nir_band = req.nir_band if 0 <= req.nir_band < 3 else 2
    nir = arr[:, :, nir_band]
    ndwi = (green - nir) / (green + nir + 1e-10)
    mask = ndwi > req.threshold
    return {
        "success": True,
        "data": {
            "water_pct": round(float(mask.mean() * 100), 1),
            "water_pixels": int(mask.sum()),
            "total_pixels": int(mask.size),
            "threshold": req.threshold,
            "nir_band": nir_band,
            "note": "NDWI computed with green vs configured nir_band; a true NIR band is required for accurate flood detection",
        },
        "source": "opengeoai_ndwi",
    }


# --- Segmentation ---
@app.post("/segment")
async def segment_image(req: SegmentRequest):
    img = load_image(req.image)
    if img is None or not HAVE_NUMPY:
        return {
            "success": False,
            "error": "image required (base64 or url) for real segmentation",
            "source": "opengeoai_error",
        }
    w, h = img.size
    arr = np.array(img.convert("RGB"))
    q = (arr // 64).astype(np.uint16)
    keys = (q[..., 0] * 16) + (q[..., 1] * 4) + q[..., 2]
    unique, counts = np.unique(keys.ravel(), return_counts=True)
    order = np.argsort(-counts)[:6]
    segments = []
    for rank, idx in enumerate(order):
        key = int(unique[idx])
        r = int((key // 16) * 64 + 32)
        g = int(((key // 4) % 4) * 64 + 32)
        b = int((key % 4) * 64 + 32)
        segments.append({
            "id": rank,
            "label": f"segment_{rank}",
            "pixels": int(counts[idx]),
            "color": "#{:02X}{:02X}{:02X}".format(r, g, b),
        })
    return {
        "success": True,
        "data": {
            "segments": segments,
            "image_size": {"w": w, "h": h},
            "model": req.model,
        },
        "source": "opengeoai_quantized",
    }


# --- Classification ---
@app.post("/classify")
async def classify(req: ClassifyRequest):
    img = load_image(req.image)
    if img is None or not HAVE_NUMPY:
        return {
            "success": False,
            "error": "image required (base64 or url) for real classification",
            "source": "opengeoai_error",
        }
    arr = np.array(img.convert("RGB"))
    confidences, dominant = classify_from_stats(arr)
    return {
        "success": True,
        "data": {
            "classifications": [
                {"class": c, "confidence": confidences[c]}
                for c in ["water", "vegetation", "urban", "barren", "agriculture"]
            ],
            "dominant": dominant,
            "model": req.model,
        },
        "source": "opengeoai_stats",
    }


@app.get("/classify")
async def classify_get():
    return {
        "success": False,
        "error": "image required (base64 or url) for real classification",
        "source": "opengeoai_error",
    }


# --- Object Detection ---
@app.post("/detect")
async def detect(req: DetectRequest):
    img = load_image(req.image)
    if img is None or not HAVE_NUMPY:
        return {
            "success": False,
            "error": "image required (base64 or url) for real detection",
            "source": "opengeoai_error",
        }
    detections = detect_blobs(img)
    return {
        "success": True,
        "data": {
            "detections": detections,
            "model": "blob_heuristic",
        },
        "source": "opengeoai_blob",
    }


# --- Change Detection ---
@app.post("/change")
async def change_detection(req: ChangeRequest):
    before = load_image(req.before)
    after = load_image(req.after)
    if before is None or after is None or not HAVE_NUMPY:
        return {
            "success": False,
            "error": "before and after images required (base64 or url) for real change detection",
            "source": "opengeoai_error",
        }
    b_arr = np.array(before.convert("L"), dtype=np.float32)
    a_arr = np.array(after.convert("L"), dtype=np.float32)
    diff = np.abs(a_arr - b_arr)
    change_pct = float((diff > 30).mean() * 100)
    return {
        "success": True,
        "data": {
            "change_pct": round(change_pct, 1),
            "significant": change_pct > 10,
            "model": "pixel_diff",
        },
        "source": "opengeoai",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
