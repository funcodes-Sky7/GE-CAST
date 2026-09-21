#!/usr/bin/env python3
"""
GEOCAST Multi-Device Fleet GPS & Telemetry Simulator (v3 — Smooth Movement & Ad Rotation Demo)
==============================================================================================
Designed specifically for live hackathon evaluation:
  1. 5–8 selected online moving devices (BUS-001 through BUS-007) move slowly & smoothly along
     deterministic intercity corridors.
  2. Waypoint transition takes SIMULATOR_TRANSITION_TIME (default 20 seconds) with continuous GPS
     interpolation (~1 telemetry ping every 0.8–1.0s) so evaluators can observe the complete
     3-second advertisement rotation before the device enters another zone.
  3. The remaining fleet devices (billboards, kiosks, stations, stationary buses) send periodic
     heartbeats every 15s to remain ONLINE without cluttering the map.
  4. Automatic zone-crossing & dynamic ad-rotation playlist logs.

Usage:
    python simulator/device_simulator.py                                # Standard demo (7 moving + stationary)
    python simulator/device_simulator.py --transition-time 20           # 20s per city leg
    python simulator/device_simulator.py --device BUS-001               # Single device focused test
    python simulator/device_simulator.py --all-moving                   # Move all 15 buses
"""

import sys
import asyncio
import argparse
from typing import Optional, List, Dict, Any

import httpx

# ── Configurable Timing Constants (Per Requirements) ────────────────────────
SIMULATOR_TRANSITION_TIME = 20.0  # Seconds per city-to-city waypoint transition (Hackathon Demo default)
TELEMETRY_INTERVAL        = 1.0   # Seconds between intermediate GPS telemetry updates

# Calculate intermediate interpolation steps between major anchors
STEPS_PER_TRANSITION = max(5, int(SIMULATOR_TRANSITION_TIME / TELEMETRY_INTERVAL))


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


def build_route(stops, steps_between=STEPS_PER_TRANSITION):
    """
    Build a full waypoint list from named city stops, inserting
    `steps_between` interpolated GPS points between each pair so the
    device smoothly glides across the map and transitions between zones.
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
# Deterministic Evaluation Routes (with smooth intermediate interpolation)
# ---------------------------------------------------------------------------
ROUTE_A = build_route([CHANDIGARH, AMBALA, DELHI, AGRA])      # Route A: BUS-001
ROUTE_B = build_route([DELHI, AGRA, JAIPUR])                 # Route B: BUS-002
ROUTE_C = build_route([JAIPUR, AHMEDABAD, MUMBAI])           # Route C: BUS-003
ROUTE_D = build_route([MUMBAI, PUNE, BENGALURU])             # Route D: BUS-004
ROUTE_E = build_route([DELHI, LUCKNOW])                      # Route E: BUS-005
ROUTE_F = build_route([CHANDIGARH, AMBALA, DELHI])           # Route F: BUS-006
ROUTE_G = build_route([DELHI, AGRA, JAIPUR])                 # Route G: BUS-007

# ---------------------------------------------------------------------------
# Active Moving Devices (5–8 devices for clarity)
# ---------------------------------------------------------------------------
DEMO_MOVING_DEVICE_IDS = ["BUS-001", "BUS-002", "BUS-003", "BUS-004", "BUS-005", "BUS-006", "BUS-007"]

# ---------------------------------------------------------------------------
# Fleet Profiles
# ---------------------------------------------------------------------------
FLEET_PROFILES = {
    # ── Designated smooth moving buses (5–8 devices for live demo) ───────────
    "BUS-001": {"name": "Chandigarh Volvo Express 101",   "type": "BUS", "token": "token_BUS001", "delay": TELEMETRY_INTERVAL, "waypoints": ROUTE_A},
    "BUS-002": {"name": "NH44 Intercity Express 202",      "type": "BUS", "token": "token_BUS002", "delay": TELEMETRY_INTERVAL, "waypoints": ROUTE_B},
    "BUS-003": {"name": "Jaipur Pink City Shuttle 505",    "type": "BUS", "token": "token_BUS003", "delay": TELEMETRY_INTERVAL, "waypoints": ROUTE_C},
    "BUS-004": {"name": "Mumbai BEST Route 707",           "type": "BUS", "token": "token_BUS004", "delay": TELEMETRY_INTERVAL, "waypoints": ROUTE_D},
    "BUS-005": {"name": "Delhi-Lucknow Volvo 1010",        "type": "BUS", "token": "token_BUS005", "delay": TELEMETRY_INTERVAL, "waypoints": ROUTE_E},
    "BUS-006": {"name": "Chandigarh Metro Link 1111",      "type": "BUS", "token": "token_BUS006", "delay": TELEMETRY_INTERVAL, "waypoints": ROUTE_F},
    "BUS-007": {"name": "Delhi Agra Express 1212",         "type": "BUS", "token": "token_BUS007", "delay": TELEMETRY_INTERVAL, "waypoints": ROUTE_G},

    # ── Stationary buses (stay online at base terminal, ping every 15s) ───────
    "BUS-008": {"name": "Pune-Mumbai Shivneri 808",        "type": "BUS", "token": "token_BUS008", "delay": 15.0, "waypoints": [PUNE]},
    "BUS-009": {"name": "UP Roadways Lucknow 909",         "type": "BUS", "token": "token_BUS009", "delay": 15.0, "waypoints": [LUCKNOW]},
    "BUS-010": {"name": "Delhi City Intercity 1010",       "type": "BUS", "token": "token_BUS010", "delay": 15.0, "waypoints": [DELHI]},
    "BUS-011": {"name": "Chandigarh Urban Transit 1111",   "type": "BUS", "token": "token_BUS011", "delay": 15.0, "waypoints": [CHANDIGARH]},
    "BUS-012": {"name": "Agra Heritage Tour Bus 1212",     "type": "BUS", "token": "token_BUS012", "delay": 15.0, "waypoints": [AGRA]},
    "BUS-013": {"name": "Jaipur-Ahmedabad Bus 1313",       "type": "BUS", "token": "token_BUS013", "delay": 15.0, "waypoints": [JAIPUR]},
    "BUS-014": {"name": "Ahmedabad-Mumbai Bus 1414",       "type": "BUS", "token": "token_BUS014", "delay": 15.0, "waypoints": [AHMEDABAD]},
    "BUS-015": {"name": "Bengaluru City Transit 1515",     "type": "BUS", "token": "token_BUS015", "delay": 15.0, "waypoints": [BENGALURU]},

    # ── Trains (Stationary / at platform anchors) ────────────────────────────
    "TRAIN-001": {"name": "Vande Bharat Chandigarh-Delhi", "type": "TRAIN", "token": "token_TRAIN001", "delay": 15.0, "waypoints": [CHANDIGARH]},
    "TRAIN-002": {"name": "Rajdhani Express Delhi-Agra",   "type": "TRAIN", "token": "token_TRAIN002", "delay": 15.0, "waypoints": [DELHI]},
    "TRAIN-003": {"name": "Jaipur-Mumbai Express",         "type": "TRAIN", "token": "token_TRAIN003", "delay": 15.0, "waypoints": [JAIPUR]},
    "TRAIN-004": {"name": "Deccan Queen Mumbai-Pune",      "type": "TRAIN", "token": "token_TRAIN004", "delay": 15.0, "waypoints": [MUMBAI]},
    "TRAIN-005": {"name": "Lucknow-Delhi Shatabdi",        "type": "TRAIN", "token": "token_TRAIN005", "delay": 15.0, "waypoints": [LUCKNOW]},
    "TRAIN-006": {"name": "Intercity Delhi-Jaipur",        "type": "TRAIN", "token": "token_TRAIN006", "delay": 15.0, "waypoints": [DELHI]},
    "TRAIN-007": {"name": "Ahmedabad-Pune Express",        "type": "TRAIN", "token": "token_TRAIN007", "delay": 15.0, "waypoints": [AHMEDABAD]},
    "TRAIN-008": {"name": "Bengaluru-Pune Superfast",      "type": "TRAIN", "token": "token_TRAIN008", "delay": 15.0, "waypoints": [BENGALURU]},

    # ── Static billboards (single waypoint = fixed location) ────────────────
    "BILLBOARD-001": {"name": "Chandigarh Tribune Chowk LED",   "type": "LED_SCREEN",      "token": "token_BB001", "delay": 15.0,
                      "waypoints": [{"name": "Chandigarh Tribune Chowk",   "lat": 30.7046, "lon": 76.7985}]},
    "BILLBOARD-002": {"name": "Delhi Connaught Place Signage",  "type": "DIGITAL_SIGNAGE", "token": "token_BB002", "delay": 15.0,
                      "waypoints": [{"name": "Delhi Connaught Place",      "lat": 28.6328, "lon": 77.2197}]},
    "BILLBOARD-003": {"name": "Jaipur MI Road Hoarding",        "type": "LED_SCREEN",      "token": "token_BB003", "delay": 15.0,
                      "waypoints": [{"name": "Jaipur MI Road",             "lat": 26.9259, "lon": 75.7874}]},
    "BILLBOARD-004": {"name": "Ahmedabad SG Highway Billboard", "type": "LED_SCREEN",      "token": "token_BB004", "delay": 15.0,
                      "waypoints": [{"name": "Ahmedabad SG Highway",       "lat": 23.0358, "lon": 72.5973}]},
    "BILLBOARD-005": {"name": "Mumbai Bandra Worli Hoarding",   "type": "DIGITAL_SIGNAGE", "token": "token_BB005", "delay": 15.0,
                      "waypoints": [{"name": "Mumbai BKC",                 "lat": 19.0657, "lon": 72.8687}]},
    "BILLBOARD-006": {"name": "Pune FC Road LED Screen",        "type": "LED_SCREEN",      "token": "token_BB006", "delay": 15.0,
                      "waypoints": [{"name": "Pune FC Road",               "lat": 18.5314, "lon": 73.8446}]},
    "BILLBOARD-007": {"name": "Bengaluru MG Road Signage",      "type": "DIGITAL_SIGNAGE", "token": "token_BB007", "delay": 15.0,
                      "waypoints": [{"name": "Bengaluru MG Road",          "lat": 12.9756, "lon": 77.6027}]},

    # ── Static station displays ──────────────────────────────────────────────
    "STATION-001": {"name": "Delhi ISBT Kashmiri Gate",    "type": "STATION", "token": "token_STN001", "delay": 15.0,
                    "waypoints": [{"name": "Delhi ISBT Kashmiri Gate", "lat": 28.6675, "lon": 77.2285}]},
    "STATION-002": {"name": "Chandigarh ISBT Sector 43",   "type": "STATION", "token": "token_STN002", "delay": 15.0,
                    "waypoints": [{"name": "Chandigarh ISBT Sector 43","lat": 30.7180, "lon": 76.7550}]},
    "STATION-003": {"name": "Mumbai CST Platform Display", "type": "STATION", "token": "token_STN003", "delay": 15.0,
                    "waypoints": [{"name": "Mumbai CSMT",               "lat": 18.9402, "lon": 72.8358}]},
    "STATION-004": {"name": "Bengaluru Majestic Terminal", "type": "STATION", "token": "token_STN004", "delay": 15.0,
                    "waypoints": [{"name": "Bengaluru Kempegowda ISBT", "lat": 12.9773, "lon": 77.5682}]},
    "STATION-005": {"name": "Jaipur Sindhi Camp Station",  "type": "STATION", "token": "token_STN005", "delay": 15.0,
                    "waypoints": [{"name": "Jaipur Sindhi Camp",        "lat": 26.9071, "lon": 75.7957}]},

    # ── Static kiosks ────────────────────────────────────────────────────────
    "KIOSK-001": {"name": "Chandigarh Sector 17 Kiosk", "type": "KIOSK", "token": "token_KSK001", "delay": 15.0,
                  "waypoints": [{"name": "Chandigarh Sector 17",  "lat": 30.7381, "lon": 76.7800}]},
    "KIOSK-002": {"name": "Delhi CP Interactive Kiosk", "type": "KIOSK", "token": "token_KSK002", "delay": 15.0,
                  "waypoints": [{"name": "Delhi Connaught Place", "lat": 28.6315, "lon": 77.2167}]},
    "KIOSK-003": {"name": "Jaipur Hawa Mahal Kiosk",    "type": "KIOSK", "token": "token_KSK003", "delay": 15.0,
                  "waypoints": [{"name": "Jaipur Hawa Mahal",     "lat": 26.9239, "lon": 75.8267}]},
    "KIOSK-004": {"name": "Mumbai Gateway Kiosk",       "type": "KIOSK", "token": "token_KSK004", "delay": 15.0,
                  "waypoints": [{"name": "Mumbai Gateway",        "lat": 18.9220, "lon": 72.8347}]},
    "KIOSK-005": {"name": "Bengaluru UB City Kiosk",   "type": "KIOSK", "token": "token_KSK005", "delay": 15.0,
                  "waypoints": [{"name": "Bengaluru UB City",     "lat": 12.9719, "lon": 77.5937}]},
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
    """Simulate a single device: cycle through intermediate waypoints smoothly forever."""
    waypoints = profile["waypoints"]
    token     = profile["token"]
    step_delay = max(0.2, profile["delay"] / speed_factor)
    url = f"{server_url}/api/device/{device_id}/heartbeat"
    headers = {"X-Device-Token": token, "Content-Type": "application/json"}

    is_static = len(waypoints) <= 1

    # Stagger startup so all devices don't hammer the server at t=0
    if stagger_delay > 0:
        await asyncio.sleep(stagger_delay)

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
                    zone_name     = data.get("zone_name") or "Transit Corridor"
                    content       = data.get("content") or {}
                    content_title = content.get("title") or "No content"
                    reason        = data.get("reason") or ""
                    playlist      = data.get("playlist") or []

                    # Detect and prominently log zone change
                    zone_changed = (prev_zone is not None and prev_zone != zone_name)
                    content_changed = (prev_content is not None and prev_content != content_title)

                    if not is_static:
                        loc_label = wp["name"][:28]
                        playlist_summary = f"{len(playlist)} ads rotating (3s)" if len(playlist) > 1 else (content_title[:20] if content_title else "—")
                        print(
                            f"[{device_id:9s}] 📍 {loc_label:28s} | "
                            f"Zone: {zone_name:18s} | "
                            f"Ad: {playlist_summary:25s}"
                        )

                    if zone_changed:
                        print(
                            f"\n  ★ ★ ZONE CHANGED  [{device_id}]  "
                            f"'{prev_zone}'  ──▶  '{zone_name}'"
                        )
                        print(f"  [PLAYER] {device_id}: switched to {zone_name} playlist ({len(playlist)} items)", flush=True)
                        if playlist:
                            names = " → ".join([item.get("title", "Ad") for item in playlist[:4]])
                            print(f"       New Playlist ({len(playlist)} ads, 3s slot): {names}\n")

                    if content_changed and not zone_changed:
                        print(
                            f"  ★ CONTENT UPDATE  [{device_id}]  "
                            f"'{prev_content}'  ──▶  '{content_title}'  ({reason})"
                        )

                    prev_zone    = zone_name
                    prev_content = content_title

                else:
                    print(f"[{device_id:9s}] ⚠️  HTTP {resp.status_code}: {resp.text[:60]}")

            except httpx.ConnectError:
                print(f"[{device_id:9s}] ❌ Cannot connect to {server_url}. Retrying in 5s…")
                await asyncio.sleep(5)
                continue
            except Exception as exc:
                print(f"[{device_id:9s}] ❌ Error: {exc}")

            await asyncio.sleep(step_delay)


# ---------------------------------------------------------------------------
# Main async entry point
# ---------------------------------------------------------------------------
async def main_async(server_url: str, selected_devices: list, speed_factor: float, delay_override: Optional[float]):
    total = len(selected_devices)
    movers = [d for d in selected_devices if len(FLEET_PROFILES[d]["waypoints"]) > 1]
    static = [d for d in selected_devices if len(FLEET_PROFILES[d]["waypoints"]) <= 1]

    print("=" * 100)
    print("  📡  GEOCAST FLEET SIMULATOR — (Ad Rotation & Smooth Movement Demo)")
    print(f"  Server          : {server_url}")
    print(f"  Total Devices   : {total} ({len(movers)} Moving, {len(static)} Stationary Online)")
    print(f"  Transition Time : {SIMULATOR_TRANSITION_TIME}s per waypoint leg")
    print(f"  Telemetry Rate  : 1 update every {TELEMETRY_INTERVAL}s (~{STEPS_PER_TRANSITION} steps per city leg)")
    print(f"  Speed factor    : {speed_factor}×")
    print("=" * 100)
    print(f"{'DEVICE':9s} | {'LOCATION':28s} | {'ZONE':18s} | AD / PLAYLIST")
    print("-" * 100)

    # Apply optional global delay override
    if delay_override is not None:
        for pid in selected_devices:
            FLEET_PROFILES[pid]["delay"] = delay_override

    async with httpx.AsyncClient() as client:
        tasks = []
        for i, dev_id in enumerate(selected_devices):
            if dev_id not in FLEET_PROFILES:
                continue
            profile = FLEET_PROFILES[dev_id]
            stagger = (i % 8) * 0.2
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
        description="GEOCAST Multi-Device Fleet Simulator (Smooth Movement & Ad Rotation Demo)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python simulator/device_simulator.py                    # Balanced demo (7 moving + stationary online)
  python simulator/device_simulator.py --device BUS-001   # Single device demo
  python simulator/device_simulator.py --transition-time 20 # 20 seconds per city leg
  python simulator/device_simulator.py --all-moving       # Move all buses
        """
    )
    parser.add_argument("--server",  default="http://127.0.0.1:8000",
                        help="Backend HTTP base URL (default: http://127.0.0.1:8000)")
    parser.add_argument("--device",  default=None, dest="device_id",
                        help="Simulate only this device ID (e.g. BUS-001)")
    parser.add_argument("--speed",   type=float, default=1.0,
                        help="Speed multiplier (default 1.0)")
    parser.add_argument("--delay",   type=float, default=None,
                        help="Override seconds between steps for all devices")
    parser.add_argument("--transition-time", type=float, default=20.0,
                        help="Seconds to transition between waypoints (default: 20.0s)")
    parser.add_argument("--moving-only", action="store_true",
                        help="Simulate only actively moving devices")
    parser.add_argument("--all-moving", action="store_true",
                        help="Move all 15 buses along intercity routes")

    args = parser.parse_args()

    global SIMULATOR_TRANSITION_TIME, STEPS_PER_TRANSITION
    SIMULATOR_TRANSITION_TIME = args.transition_time
    STEPS_PER_TRANSITION = max(5, int(SIMULATOR_TRANSITION_TIME / TELEMETRY_INTERVAL))

    # Select devices
    if args.device_id:
        if args.device_id not in FLEET_PROFILES:
            print(f"❌ Unknown device '{args.device_id}'")
            print(f"   Available: {', '.join(ALL_DEVICE_IDS)}")
            raise SystemExit(1)
        devices = [args.device_id]
    elif args.moving_only:
        devices = DEMO_MOVING_DEVICE_IDS
    else:
        # Default: all 40 devices (7 designated movers + 33 stationary online)
        devices = ALL_DEVICE_IDS

    try:
        asyncio.run(main_async(args.server, devices, args.speed, args.delay))
    except KeyboardInterrupt:
        print("\n🛑  Simulation stopped.")


if __name__ == "__main__":
    main()
