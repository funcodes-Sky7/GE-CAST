#!/usr/bin/env python3
"""
GEOCAST Multi-Device Fleet GPS & Telemetry Simulator (v2)
=========================================================
Simulates 40 devices concurrently:
  - 15 Bus Displays  (moving along deterministic multi-city routes)
  -  8 Train Displays (moving, faster, longer routes)
  -  7 Billboards    (stationary — ping only, no movement)
  -  5 Station Displays (stationary)
  -  5 Kiosks          (stationary)

Every device sends  POST /api/device/{device_id}/heartbeat  at the
configured interval.  Moving devices cycle through their waypoints
forever so zone crossings are continuously demonstrated.

Usage:
    python simulator/device_simulator.py                    # all devices, 1x speed
    python simulator/device_simulator.py --speed 5          # 5× faster (demo mode)
    python simulator/device_simulator.py --delay 2          # 2-second steps
    python simulator/device_simulator.py --device BUS-001   # single device

Zone crossing demo timeline at --speed 5 (≈5s per waypoint):
  BUS-001  Chandigarh → Ambala → Delhi → Agra        ~2 min cycle
  TRAIN-001 Chandigarh → Ambala → Delhi → Agra       ~1.5 min cycle
"""

import sys
import asyncio
import argparse
from typing import Optional

import httpx

# ---------------------------------------------------------------------------
# Helper: generate intermediate waypoints between two lat/lon points
# ---------------------------------------------------------------------------
def interp(p1, p2, n, name1, name2):
    """Return n-1 intermediate lat/lon dicts between p1 and p2 (exclusive endpoints)."""
    result = []
    for i in range(1, n):
        t = i / n
        result.append({
            "name": f"{name1} → {name2} ({i}/{n})",
            "lat": p1["lat"] + t * (p2["lat"] - p1["lat"]),
            "lon": p1["lon"] + t * (p2["lon"] - p1["lon"]),
        })
    return result


def build_route(stops, steps_between=3):
    """
    Build a full waypoint list from named city stops, inserting
    `steps_between` interpolated GPS points between each pair so the
    device visibly moves across the map and the geo engine can detect
    the moment it crosses a zone boundary.
    """
    route = []
    for i, stop in enumerate(stops):
        route.append(stop)
        if i < len(stops) - 1:
            route.extend(interp(stop, stops[i + 1], steps_between + 1,
                                stop["name"], stops[i + 1]["name"]))
    return route


# ---------------------------------------------------------------------------
# Named city anchors (used by multiple devices)
# ---------------------------------------------------------------------------
CHANDIGARH  = {"name": "Chandigarh",  "lat": 30.7333, "lon": 76.7794}
AMBALA      = {"name": "Ambala",      "lat": 30.3782, "lon": 76.7767}
DELHI       = {"name": "Delhi",       "lat": 28.6520, "lon": 77.2315}
AGRA        = {"name": "Agra",        "lat": 27.1767, "lon": 78.0081}
JAIPUR      = {"name": "Jaipur",      "lat": 26.9124, "lon": 75.7873}
LUCKNOW     = {"name": "Lucknow",     "lat": 26.8467, "lon": 80.9462}
AHMEDABAD   = {"name": "Ahmedabad",   "lat": 23.0258, "lon": 72.5873}
MUMBAI      = {"name": "Mumbai",      "lat": 19.0730, "lon": 72.8830}
PUNE        = {"name": "Pune",        "lat": 18.5204, "lon": 73.8567}
BENGALURU   = {"name": "Bengaluru",   "lat": 12.9716, "lon": 77.5946}

# ---------------------------------------------------------------------------
# Route A: Chandigarh → Ambala → Delhi → Agra
# ---------------------------------------------------------------------------
ROUTE_A = build_route([CHANDIGARH, AMBALA, DELHI, AGRA], steps_between=4)

# ---------------------------------------------------------------------------
# Route B: Delhi → Agra → Jaipur
# ---------------------------------------------------------------------------
ROUTE_B = build_route([DELHI, AGRA, JAIPUR], steps_between=4)

# ---------------------------------------------------------------------------
# Route C: Jaipur → Ahmedabad → Mumbai
# ---------------------------------------------------------------------------
ROUTE_C = build_route([JAIPUR, AHMEDABAD, MUMBAI], steps_between=4)

# ---------------------------------------------------------------------------
# Route D: Mumbai → Pune → Bengaluru
# ---------------------------------------------------------------------------
ROUTE_D = build_route([MUMBAI, PUNE, BENGALURU], steps_between=4)

# ---------------------------------------------------------------------------
# Route E: Delhi → Lucknow
# ---------------------------------------------------------------------------
ROUTE_E = build_route([DELHI, LUCKNOW], steps_between=5)

# ---------------------------------------------------------------------------
# Partial / variant routes
# ---------------------------------------------------------------------------
ROUTE_F = build_route([CHANDIGARH, AMBALA, DELHI], steps_between=4)         # BUS-011
ROUTE_G = build_route([DELHI, AGRA], steps_between=5)                        # BUS-012
ROUTE_H = build_route([JAIPUR, AHMEDABAD], steps_between=5)                  # BUS-013
ROUTE_I = build_route([AHMEDABAD, MUMBAI], steps_between=5)                  # BUS-014
ROUTE_J = build_route([MUMBAI, PUNE, BENGALURU], steps_between=4)            # BUS-015

ROUTE_K = build_route([DELHI, AGRA, JAIPUR], steps_between=4)               # TRAIN-006
ROUTE_L = build_route([AHMEDABAD, MUMBAI, PUNE], steps_between=4)            # TRAIN-007
ROUTE_M = build_route([PUNE, BENGALURU], steps_between=5)                    # TRAIN-008

# ---------------------------------------------------------------------------
# Fleet Profiles
# ---------------------------------------------------------------------------
FLEET_PROFILES = {

    # ── Moving buses ──────────────────────────────────────────────────────
    "BUS-001": {"name": "Chandigarh Volvo Express 101",     "type": "BUS",   "token": "token_BUS001",  "delay": 3.0, "waypoints": ROUTE_A},
    "BUS-002": {"name": "NH44 Intercity Express 202",        "type": "BUS",   "token": "token_BUS002",  "delay": 3.5, "waypoints": ROUTE_A},
    "BUS-003": {"name": "Delhi Metro Feeder 303",            "type": "BUS",   "token": "token_BUS003",  "delay": 3.0, "waypoints": ROUTE_B},
    "BUS-004": {"name": "Rajdhani Road Express 404",         "type": "BUS",   "token": "token_BUS004",  "delay": 3.5, "waypoints": ROUTE_B},
    "BUS-005": {"name": "Jaipur Pink City Shuttle 505",      "type": "BUS",   "token": "token_BUS005",  "delay": 3.0, "waypoints": ROUTE_C},
    "BUS-006": {"name": "Rajasthan Roadways 606",            "type": "BUS",   "token": "token_BUS006",  "delay": 3.5, "waypoints": ROUTE_C},
    "BUS-007": {"name": "Mumbai BEST Route 707",             "type": "BUS",   "token": "token_BUS007",  "delay": 3.0, "waypoints": ROUTE_D},
    "BUS-008": {"name": "Pune-Mumbai Shivneri 808",          "type": "BUS",   "token": "token_BUS008",  "delay": 3.5, "waypoints": ROUTE_D},
    "BUS-009": {"name": "UP Roadways Lucknow 909",           "type": "BUS",   "token": "token_BUS009",  "delay": 3.0, "waypoints": ROUTE_E},
    "BUS-010": {"name": "Delhi-Lucknow Volvo 1010",          "type": "BUS",   "token": "token_BUS010",  "delay": 3.5, "waypoints": ROUTE_E},
    "BUS-011": {"name": "Chandigarh Metro Link 1111",        "type": "BUS",   "token": "token_BUS011",  "delay": 4.0, "waypoints": ROUTE_F},
    "BUS-012": {"name": "Delhi Agra Highway Express 1212",   "type": "BUS",   "token": "token_BUS012",  "delay": 4.0, "waypoints": ROUTE_G},
    "BUS-013": {"name": "Jaipur-Ahmedabad State Bus 1313",   "type": "BUS",   "token": "token_BUS013",  "delay": 4.0, "waypoints": ROUTE_H},
    "BUS-014": {"name": "Ahmedabad-Mumbai Volvo 1414",       "type": "BUS",   "token": "token_BUS014",  "delay": 4.0, "waypoints": ROUTE_I},
    "BUS-015": {"name": "Bengaluru-Pune KSRTC 1515",         "type": "BUS",   "token": "token_BUS015",  "delay": 4.0, "waypoints": ROUTE_J},

    # ── Moving trains ─────────────────────────────────────────────────────
    "TRAIN-001": {"name": "Vande Bharat Chandigarh-Delhi",  "type": "TRAIN", "token": "token_TRAIN001", "delay": 2.5, "waypoints": ROUTE_A},
    "TRAIN-002": {"name": "Rajdhani Express Delhi-Agra",    "type": "TRAIN", "token": "token_TRAIN002", "delay": 2.5, "waypoints": ROUTE_B},
    "TRAIN-003": {"name": "Jaipur-Mumbai Express",          "type": "TRAIN", "token": "token_TRAIN003", "delay": 2.5, "waypoints": ROUTE_C},
    "TRAIN-004": {"name": "Deccan Queen Mumbai-Pune",       "type": "TRAIN", "token": "token_TRAIN004", "delay": 2.5, "waypoints": ROUTE_D},
    "TRAIN-005": {"name": "Lucknow-Delhi Shatabdi",         "type": "TRAIN", "token": "token_TRAIN005", "delay": 2.5, "waypoints": ROUTE_E},
    "TRAIN-006": {"name": "Intercity Delhi-Jaipur",         "type": "TRAIN", "token": "token_TRAIN006", "delay": 2.5, "waypoints": ROUTE_K},
    "TRAIN-007": {"name": "Ahmedabad-Pune Express",         "type": "TRAIN", "token": "token_TRAIN007", "delay": 2.5, "waypoints": ROUTE_L},
    "TRAIN-008": {"name": "Bengaluru-Pune Superfast",       "type": "TRAIN", "token": "token_TRAIN008", "delay": 2.5, "waypoints": ROUTE_M},

    # ── Static billboards (single waypoint = fixed location) ─────────────
    "BILLBOARD-001": {"name": "Chandigarh Tribune Chowk LED",   "type": "LED_SCREEN",      "token": "token_BB001", "delay": 15.0,
                      "waypoints": [{"name": "Chandigarh Tribune Chowk",    "lat": 30.7046, "lon": 76.7985}]},
    "BILLBOARD-002": {"name": "Delhi Connaught Place Signage",  "type": "DIGITAL_SIGNAGE", "token": "token_BB002", "delay": 15.0,
                      "waypoints": [{"name": "Delhi Connaught Place",       "lat": 28.6328, "lon": 77.2197}]},
    "BILLBOARD-003": {"name": "Jaipur MI Road Hoarding",        "type": "LED_SCREEN",      "token": "token_BB003", "delay": 15.0,
                      "waypoints": [{"name": "Jaipur MI Road",              "lat": 26.9259, "lon": 75.7874}]},
    "BILLBOARD-004": {"name": "Ahmedabad SG Highway Billboard", "type": "LED_SCREEN",      "token": "token_BB004", "delay": 15.0,
                      "waypoints": [{"name": "Ahmedabad SG Highway",        "lat": 23.0358, "lon": 72.5973}]},
    "BILLBOARD-005": {"name": "Mumbai Bandra Worli Hoarding",   "type": "DIGITAL_SIGNAGE", "token": "token_BB005", "delay": 15.0,
                      "waypoints": [{"name": "Mumbai BKC",                  "lat": 19.0657, "lon": 72.8687}]},
    "BILLBOARD-006": {"name": "Pune FC Road LED Screen",        "type": "LED_SCREEN",      "token": "token_BB006", "delay": 15.0,
                      "waypoints": [{"name": "Pune FC Road",                "lat": 18.5314, "lon": 73.8446}]},
    "BILLBOARD-007": {"name": "Bengaluru MG Road Signage",      "type": "DIGITAL_SIGNAGE", "token": "token_BB007", "delay": 15.0,
                      "waypoints": [{"name": "Bengaluru MG Road",           "lat": 12.9756, "lon": 77.6027}]},

    # ── Static station displays ───────────────────────────────────────────
    "STATION-001": {"name": "Delhi ISBT Kashmiri Gate",    "type": "STATION", "token": "token_STN001", "delay": 15.0,
                    "waypoints": [{"name": "Delhi ISBT Kashmiri Gate",  "lat": 28.6675, "lon": 77.2285}]},
    "STATION-002": {"name": "Chandigarh ISBT Sector 43",   "type": "STATION", "token": "token_STN002", "delay": 15.0,
                    "waypoints": [{"name": "Chandigarh ISBT Sector 43", "lat": 30.7180, "lon": 76.7550}]},
    "STATION-003": {"name": "Mumbai CST Platform Display", "type": "STATION", "token": "token_STN003", "delay": 15.0,
                    "waypoints": [{"name": "Mumbai CSMT",                "lat": 18.9402, "lon": 72.8358}]},
    "STATION-004": {"name": "Bengaluru Majestic Terminal", "type": "STATION", "token": "token_STN004", "delay": 15.0,
                    "waypoints": [{"name": "Bengaluru Kempegowda ISBT",  "lat": 12.9773, "lon": 77.5682}]},
    "STATION-005": {"name": "Jaipur Sindhi Camp Station",  "type": "STATION", "token": "token_STN005", "delay": 15.0,
                    "waypoints": [{"name": "Jaipur Sindhi Camp",         "lat": 26.9071, "lon": 75.7957}]},

    # ── Static kiosks ─────────────────────────────────────────────────────
    "KIOSK-001": {"name": "Chandigarh Sector 17 Kiosk", "type": "KIOSK", "token": "token_KSK001", "delay": 15.0,
                  "waypoints": [{"name": "Chandigarh Sector 17",   "lat": 30.7381, "lon": 76.7800}]},
    "KIOSK-002": {"name": "Delhi CP Interactive Kiosk", "type": "KIOSK", "token": "token_KSK002", "delay": 15.0,
                  "waypoints": [{"name": "Delhi Connaught Place",  "lat": 28.6315, "lon": 77.2167}]},
    "KIOSK-003": {"name": "Jaipur Hawa Mahal Kiosk",    "type": "KIOSK", "token": "token_KSK003", "delay": 15.0,
                  "waypoints": [{"name": "Jaipur Hawa Mahal",      "lat": 26.9239, "lon": 75.8267}]},
    "KIOSK-004": {"name": "Mumbai Gateway Kiosk",       "type": "KIOSK", "token": "token_KSK004", "delay": 15.0,
                  "waypoints": [{"name": "Mumbai Gateway",         "lat": 18.9220, "lon": 72.8347}]},
    "KIOSK-005": {"name": "Bengaluru UB City Kiosk",   "type": "KIOSK", "token": "token_KSK005", "delay": 15.0,
                  "waypoints": [{"name": "Bengaluru UB City",      "lat": 12.9719, "lon": 77.5937}]},
}

ALL_DEVICE_IDS = list(FLEET_PROFILES.keys())  # 40 total

# ---------------------------------------------------------------------------
# Async simulation worker for a single device
# ---------------------------------------------------------------------------
async def run_device_simulation(
    client: httpx.AsyncClient,
    server_url: str,
    device_id: str,
    profile: dict,
    speed_factor: float = 1.0,
    stagger_delay: float = 0.0,
):
    """Simulate a single device: cycle through waypoints forever."""
    waypoints = profile["waypoints"]
    token     = profile["token"]
    step_delay = max(0.2, profile["delay"] / speed_factor)
    url = f"{server_url}/api/device/{device_id}/heartbeat"
    headers = {"X-Device-Token": token, "Content-Type": "application/json"}

    is_static = len(waypoints) == 1
    dtype = profile["type"]

    # Stagger startup so all devices don't hammer the server at t=0
    if stagger_delay > 0:
        await asyncio.sleep(stagger_delay)

    # State tracking for logging zone/content transitions
    prev_zone    = None
    prev_content = None
    iteration    = 0

    while True:
        iteration += 1
        indices = [0] if is_static else range(len(waypoints))

        for idx in indices:
            wp = waypoints[idx]

            try:
                resp = await client.post(
                    url, json={"latitude": wp["lat"], "longitude": wp["lon"]},
                    headers=headers, timeout=6.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    zone_name    = data.get("zone_name") or "—"
                    content      = data.get("content") or {}
                    content_title = content.get("title") or "No content"
                    reason       = data.get("reason") or ""

                    # Detect and loudly log zone change
                    zone_changed    = (prev_zone    is not None and prev_zone    != zone_name)
                    content_changed = (prev_content is not None and prev_content != content_title)

                    if not is_static:
                        loc_label = wp["name"][:32]
                        print(
                            f"[{device_id:13s}] 📍 {loc_label:32s} | "
                            f"Zone: {zone_name:18s} | "
                            f"Ad: {content_title[:28]:28s}"
                        )

                    if zone_changed:
                        print(
                            f"  ★ ZONE CHANGE  [{device_id}]  "
                            f"{prev_zone}  →  {zone_name}"
                        )
                    if content_changed:
                        print(
                            f"  ★ CONTENT CHANGE  [{device_id}]  "
                            f"{prev_content}  →  {content_title}  ({reason})"
                        )

                    prev_zone    = zone_name
                    prev_content = content_title

                else:
                    print(f"[{device_id:13s}] ⚠️  HTTP {resp.status_code}: {resp.text[:60]}")

            except httpx.ConnectError:
                print(f"[{device_id:13s}] ❌ Cannot connect to {server_url}. Retrying in 5s…")
                await asyncio.sleep(5)
                continue
            except Exception as exc:
                print(f"[{device_id:13s}] ❌ Error: {exc}")

            # Static devices ping much less frequently than movers
            await asyncio.sleep(step_delay)

        # After completing the full route, loop back to start
        if not is_static and iteration == 1:
            pass  # quiet after first loop completes


# ---------------------------------------------------------------------------
# Main async entry point
# ---------------------------------------------------------------------------
async def main_async(server_url: str, selected_devices: list, speed_factor: float, delay_override: Optional[float]):
    total = len(selected_devices)
    print("=" * 100)
    print("  📡  GEOCAST FLEET SIMULATOR  —  v2  (40 devices)")
    print(f"  Server       : {server_url}")
    print(f"  Devices      : {total}")
    print(f"  Speed factor : {speed_factor}×  {'(DEMO MODE)' if speed_factor >= 3 else ''}")
    if delay_override:
        print(f"  Step delay   : {delay_override}s  (overridden)")
    print("=" * 100)
    print(f"{'DEVICE':13s} | {'LOCATION':32s} | {'ZONE':18s} | AD/CONTENT")
    print("-" * 100)

    # Apply optional global delay override
    if delay_override is not None:
        for pid in selected_devices:
            FLEET_PROFILES[pid]["delay"] = delay_override

    async with httpx.AsyncClient() as client:
        tasks = []
        for i, dev_id in enumerate(selected_devices):
            if dev_id not in FLEET_PROFILES:
                print(f"  ⚠️  Unknown device '{dev_id}' — skipping")
                continue
            profile = FLEET_PROFILES[dev_id]
            # Stagger start by 0.15s per device to spread initial server load
            stagger = i * 0.15
            tasks.append(
                run_device_simulation(
                    client=client,
                    server_url=server_url,
                    device_id=dev_id,
                    profile=profile,
                    speed_factor=speed_factor,
                    stagger_delay=stagger,
                )
            )
        await asyncio.gather(*tasks)


def main():
    parser = argparse.ArgumentParser(
        description="GEOCAST Multi-Device Fleet Simulator (v2 — 40 devices)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python simulator/device_simulator.py                    # all 40 devices at 1× speed
  python simulator/device_simulator.py --speed 5          # 5× faster (demo mode)
  python simulator/device_simulator.py --delay 2          # 2-second steps, all devices
  python simulator/device_simulator.py --device BUS-001   # single device
  python simulator/device_simulator.py --device BUS-001 --speed 10  # fast single device
        """
    )
    parser.add_argument("--server",  default="http://127.0.0.1:8000",
                        help="Backend HTTP base URL (default: http://127.0.0.1:8000)")
    parser.add_argument("--device",  default=None, dest="device_id",
                        help="Simulate only this device ID (e.g. BUS-001)")
    parser.add_argument("--speed",   type=float, default=1.0,
                        help="Speed multiplier — higher = faster waypoint cycling (default 1.0)")
    parser.add_argument("--delay",   type=float, default=None,
                        help="Override seconds between waypoints for all devices")
    parser.add_argument("--moving-only", action="store_true",
                        help="Skip static devices (billboards, kiosks, stations)")

    args = parser.parse_args()

    # Select devices
    if args.device_id:
        if args.device_id not in FLEET_PROFILES:
            print(f"❌ Unknown device '{args.device_id}'")
            print(f"   Available: {', '.join(ALL_DEVICE_IDS)}")
            raise SystemExit(1)
        devices = [args.device_id]
    elif args.moving_only:
        devices = [d for d in ALL_DEVICE_IDS
                   if len(FLEET_PROFILES[d]["waypoints"]) > 1]
    else:
        devices = ALL_DEVICE_IDS

    try:
        asyncio.run(main_async(args.server, devices, args.speed, args.delay))
    except KeyboardInterrupt:
        print("\n🛑  Simulation stopped.")


if __name__ == "__main__":
    main()
