#!/usr/bin/env python3
"""Build Naghme's Persian-language IPTV supplement from iptv-org public data."""
from __future__ import annotations
import csv
import io
import re
from pathlib import Path
import requests

FEEDS_URL = "https://raw.githubusercontent.com/iptv-org/database/master/data/feeds.csv"
STREAMS_URL = "https://iptv-org.github.io/api/streams.json"
OUT = Path(__file__).resolve().parents[1] / "sources" / "nexa-persian.m3u"
HEADERS = {"User-Agent": "Naghme-Persian-IPTV-Builder/1.0"}
TIMEOUT = 30

def get(url: str):
    response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    return response

def quality_score(stream: dict) -> int:
    try:
        height = int(stream.get("height") or 0)
        width = int(stream.get("width") or 0)
    except (TypeError, ValueError):
        height = width = 0
    quality = str(stream.get("format") or "").lower()
    if height >= 1080 or width >= 1920 or "1080" in quality:
        return 3
    if height >= 720 or width >= 1280 or "720" in quality or "hd" in quality:
        return 2
    if height >= 480 or "576" in quality or "480" in quality:
        return 1
    return 0

def clean(value: object) -> str:
    return str(value or "").replace('"', "'").replace("\\r", " ").replace("\\n", " ").strip()

def main() -> None:
    feeds = list(csv.DictReader(io.StringIO(get(FEEDS_URL).text)))
    channels = {}
    for row in feeds:
        langs = {x.strip().lower() for x in str(row.get("languages") or "").split(";")}
        if "fas" not in langs:
            continue
        channel = clean(row.get("channel") or row.get("id"))
        if channel:
            channels[channel] = row
    streams = get(STREAMS_URL).json()
    best = {}
    for stream in streams:
        channel = clean(stream.get("channel"))
        url = clean(stream.get("url"))
        if not channel or channel not in channels or not url or url.startswith("http://") is False and not url.startswith("https://"):
            continue
        if str(stream.get("status") or "").lower() == "offline":
            continue
        row = channels[channel]
        candidate = {
            "id": channel,
            "name": clean(row.get("name")) or channel,
            "area": clean(row.get("broadcast_area")),
            "url": url,
            "quality": clean(stream.get("format")),
            "score": quality_score(stream),
        }
        if channel not in best or candidate["score"] > best[channel]["score"]:
            best[channel] = candidate
    if not best:
        raise RuntimeError("No Persian IPTV streams found; refusing to overwrite the existing playlist.")
    lines = ["#EXTM3U"]
    for item in best.values():
        area = re.sub(r"\\bc/", "", item["area"], flags=re.I).replace(";", ", ")
        attrs = (
            f'tvg-id="{item["id"]}" tvg-name="{item["name"]}" '
            f'group-title="شبکه‌های فارسی" tvg-country="{area}" '
            f'tvg-language="fas" tvg-quality="{item["quality"]}"'
        )
        lines.append(f'#EXTINF:-1 {attrs},{item["name"]}')
        lines.append(item["url"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\\n".join(lines) + "\\n", encoding="utf-8")
    print(f"Generated {len(best)} unique Persian channels: {OUT}")

if __name__ == "__main__":
    main()
