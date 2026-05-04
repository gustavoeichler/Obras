"""Free, keyless weather lookup via Open-Meteo.

Returns a (summary, temp_c) tuple. Falls back silently to (None, None) if
the network is unavailable or the project has no coordinates — RDO works
just fine without weather.
"""
from __future__ import annotations

import logging
from datetime import date

log = logging.getLogger(__name__)

_WMO = {
    0: "Céu limpo",
    1: "Quase limpo", 2: "Parcialmente nublado", 3: "Nublado",
    45: "Neblina", 48: "Neblina com geada",
    51: "Garoa fraca", 53: "Garoa", 55: "Garoa forte",
    61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte",
    66: "Chuva congelante", 67: "Chuva congelante forte",
    71: "Neve fraca", 73: "Neve", 75: "Neve forte",
    77: "Granizo de neve",
    80: "Pancadas fracas", 81: "Pancadas", 82: "Pancadas fortes",
    85: "Neve em pancadas", 86: "Neve em pancadas forte",
    95: "Trovoada", 96: "Trovoada com granizo", 99: "Trovoada forte",
}


def fetch_weather(lat: float | None, lon: float | None, day: date) -> tuple[str | None, float | None]:
    if lat is None or lon is None:
        return None, None
    try:
        import urllib.request
        import urllib.parse
        import json

        params = {
            "latitude":  lat,
            "longitude": lon,
            "daily":     "weathercode,temperature_2m_max",
            "timezone":  "auto",
            "start_date": day.isoformat(),
            "end_date":   day.isoformat(),
        }
        url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(params)
        with urllib.request.urlopen(url, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        daily = data.get("daily") or {}
        codes = daily.get("weathercode")  or []
        temps = daily.get("temperature_2m_max") or []
        code  = codes[0] if codes else None
        temp  = temps[0] if temps else None
        summary = _WMO.get(int(code)) if code is not None else None
        return summary, float(temp) if temp is not None else None
    except Exception:
        log.warning("weather lookup failed", exc_info=True)
        return None, None
