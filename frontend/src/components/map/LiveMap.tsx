import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DeviceLocationMarker, Zone } from '../../types';

// Fix default Leaflet icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LiveMapProps {
  devices: DeviceLocationMarker[];
  zones: Zone[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (device: DeviceLocationMarker) => void;
}

function makeDeviceIcon(status: string, isSelected: boolean = false) {
  const color = status === 'ONLINE' ? '#22c55e' : status === 'OFFLINE' ? '#ef4444' : '#94a3b8';
  const stroke = isSelected ? '#38bdf8' : 'white';
  const strokeWidth = isSelected ? '2.5' : '1.5';
  const filter = isSelected ? 'filter="drop-shadow(0 0 6px #38bdf8)"' : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38" ${filter}>
    <path d="M15 1C7.82 1 2 6.82 2 14c0 9.5 13 23 13 23S28 23.5 28 14C28 6.82 22.18 1 15 1z" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="0.95"/>
    <circle cx="15" cy="14" r="7" fill="white" opacity="0.95"/>
    <circle cx="15" cy="14" r="4" fill="${color}"/>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: 'geocast-live-marker',
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -38],
  });
}

export default function LiveMap({ devices, zones, selectedDeviceId, onSelectDevice }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const circlesRef = useRef<L.Circle[]>([]);
  const polygonsRef = useRef<L.Polygon[]>([]);
  
  // Track active requestAnimationFrame animations for smooth marker gliding
  const animationsRef = useRef<Map<string, {
    startLat: number;
    startLon: number;
    targetLat: number;
    targetLon: number;
    startTime: number;
    duration: number;
    rafId: number;
  }>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [23.5, 77.5], // Centered over north-central India for better route coverage
      zoom: 5.5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      // Cancel any running animations on unmount
      animationsRef.current.forEach((anim) => cancelAnimationFrame(anim.rafId));
      animationsRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update device markers with smooth requestAnimationFrame interpolation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seenIds = new Set<string>();

    devices.forEach((device) => {
      if (device.latitude == null || device.longitude == null) return;
      seenIds.add(device.device_id);

      const isSelected = selectedDeviceId === device.device_id;
      const icon = makeDeviceIcon(device.status, isSelected);

      // Build rich popup content
      const zoneHtml = device.current_zone
        ? `<div style="margin-top:6px;padding:4px 8px;background:rgba(59,130,246,0.12);border-radius:6px;font-size:12px;color:#2563eb">
             📍 Zone: <b>${device.current_zone}</b>
           </div>`
        : `<div style="margin-top:6px;font-size:11px;color:#94a3b8;font-style:italic">Transit Corridor</div>`;

      // Rotation playlist display
      let adHtml = '';
      if (device.playlist && device.playlist.length > 1) {
        const topTitles = device.playlist.slice(0, 3).map((p, i) => `${i + 1}. ${p.title}`).join('<br/>');
        adHtml = `<div style="margin-top:5px;padding:6px 8px;background:rgba(34,197,94,0.1);border-radius:6px;font-size:11px;color:#16a34a;border:1px solid rgba(34,197,94,0.25)">
          <div style="font-weight:700;margin-bottom:3px">🎬 ${device.playlist.length} Ads Rotating (3s slot):</div>
          <div style="font-size:10px;line-height:1.4;color:#0f172a">${topTitles}</div>
        </div>`;
      } else if (device.current_content_title) {
        adHtml = `<div style="margin-top:5px;padding:5px 8px;background:rgba(34,197,94,0.1);border-radius:6px;font-size:11px;color:#16a34a">
          🎬 Ad: <b>${device.current_content_title}</b>
        </div>`;
      } else {
        adHtml = `<div style="margin-top:5px;font-size:11px;color:#94a3b8;font-style:italic">No ad assigned</div>`;
      }

      const typeLabel = device.device_type
        ? `<span style="font-size:10px;color:#64748b">${device.device_type.replace('_', ' ')}</span>`
        : '';
      const fleetLabel = device.fleet_name
        ? `<span style="font-size:10px;color:#64748b"> · ${device.fleet_name}</span>`
        : '';

      const popup = `
        <div style="font-family:Inter,sans-serif;min-width:220px;padding:2px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:2px">${device.name}</div>
          <div style="margin-bottom:6px">${typeLabel}${fleetLabel}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;
              background:${device.status === 'ONLINE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};
              color:${device.status === 'ONLINE' ? '#22c55e' : '#ef4444'}">
              ${device.status}
            </span>
            <span style="font-size:11px;color:#64748b;font-family:monospace">${device.device_id}</span>
          </div>
          ${zoneHtml}
          ${adHtml}
          <div style="font-size:10px;color:#94a3b8;margin-top:8px;border-top:1px solid #f1f5f9;padding-top:5px;display:flex;justify-content:space-between;align-items:center">
            <span>${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}</span>
            <a href="/devices/${device.device_id}" style="color:#2563eb;text-decoration:none;font-weight:600">Inspect →</a>
          </div>
        </div>
      `;

      const existing = markersRef.current.get(device.device_id);
      if (existing) {
        existing.setIcon(icon);
        existing.setPopupContent(popup);
        if (existing.isPopupOpen()) {
          existing.getPopup()?.update();
        }

        // Smooth liquid marker movement interpolation via requestAnimationFrame
        const currentLatLng = existing.getLatLng();
        const dLat = Math.abs(device.latitude - currentLatLng.lat);
        const dLon = Math.abs(device.longitude - currentLatLng.lng);
        const distanceDegrees = Math.sqrt(dLat * dLat + dLon * dLon);

        // If distance is reasonable for moving telemetry (under ~4.0 degrees), animate smoothly
        if (distanceDegrees > 0.00005 && distanceDegrees < 4.0) {
          const existingAnim = animationsRef.current.get(device.device_id);
          if (existingAnim) {
            cancelAnimationFrame(existingAnim.rafId);
          }

          const startLat = currentLatLng.lat;
          const startLon = currentLatLng.lng;
          const targetLat = device.latitude;
          const targetLon = device.longitude;
          const startTime = performance.now();
          const duration = 950; // smooth 950ms interpolation for ~1.0s telemetry interval

          const animateStep = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1.0, elapsed / duration);
            // Smooth ease-out curve
            const ease = 1 - Math.pow(1 - progress, 2);

            const interpLat = startLat + (targetLat - startLat) * ease;
            const interpLon = startLon + (targetLon - startLon) * ease;
            existing.setLatLng([interpLat, interpLon]);

            if (progress < 1.0) {
              const nextRaf = requestAnimationFrame(animateStep);
              const animObj = animationsRef.current.get(device.device_id);
              if (animObj) animObj.rafId = nextRaf;
            } else {
              animationsRef.current.delete(device.device_id);
            }
          };

          const rafId = requestAnimationFrame(animateStep);
          animationsRef.current.set(device.device_id, {
            startLat, startLon, targetLat, targetLon, startTime, duration, rafId
          });
        } else {
          // Direct snap for huge teleport jumps or initialization
          existing.setLatLng([device.latitude, device.longitude]);
        }

      } else {
        const marker = L.marker([device.latitude, device.longitude], { icon })
          .bindPopup(popup, { maxWidth: 260 })
          .addTo(map);

        marker.on('click', () => {
          onSelectDevice?.(device);
        });

        markersRef.current.set(device.device_id, marker);
      }
    });

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!seenIds.has(id)) {
        const anim = animationsRef.current.get(id);
        if (anim) cancelAnimationFrame(anim.rafId);
        animationsRef.current.delete(id);
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [devices, selectedDeviceId, onSelectDevice]);

  // Draw zone overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    circlesRef.current.forEach((c) => c.remove());
    polygonsRef.current.forEach((p) => p.remove());
    circlesRef.current = [];
    polygonsRef.current = [];

    zones.forEach((zone) => {
      const color = zone.color ?? '#3b82f6';
      if (
        zone.zone_type === 'circle' &&
        zone.center_lat != null &&
        zone.center_lon != null &&
        zone.radius_meters
      ) {
        const circle = L.circle([zone.center_lat, zone.center_lon], {
          radius: zone.radius_meters,
          color,
          fillColor: color,
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '6 4',
        })
          .bindTooltip(`<b>${zone.name}</b>`, { permanent: false, direction: 'top' })
          .addTo(map);
        circlesRef.current.push(circle);
      } else if (zone.zone_type === 'polygon' && zone.coordinates_json) {
        try {
          const coords: [number, number][] = JSON.parse(zone.coordinates_json);
          const polygon = L.polygon(coords, {
            color,
            fillColor: color,
            fillOpacity: 0.1,
            weight: 2,
          })
            .bindTooltip(`<b>${zone.name}</b>`, { permanent: false, direction: 'top' })
            .addTo(map);
          polygonsRef.current.push(polygon);
        } catch {
          // skip invalid polygon
        }
      }
    });
  }, [zones]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: '100%', height: '100%', borderRadius: 'var(--radius)' }}
    />
  );
}
