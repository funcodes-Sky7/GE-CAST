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
}

function makeDeviceIcon(status: string) {
  const color = status === 'ONLINE' ? '#22c55e' : status === 'OFFLINE' ? '#ef4444' : '#94a3b8';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}" opacity="0.9"/>
    <circle cx="14" cy="14" r="7" fill="white" opacity="0.9"/>
    <circle cx="14" cy="14" r="4" fill="${color}"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

export default function LiveMap({ devices, zones }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const circlesRef = useRef<L.Circle[]>([]);
  const polygonsRef = useRef<L.Polygon[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update device markers when devices data changes (triggered by every WS telemetry event)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seenIds = new Set<string>();

    devices.forEach((device) => {
      if (device.latitude == null || device.longitude == null) return;
      seenIds.add(device.device_id);

      const icon = makeDeviceIcon(device.status);

      // Rich popup with live zone + advertisement (content) info
      const zoneHtml = device.current_zone
        ? `<div style="margin-top:6px;padding:4px 8px;background:rgba(59,130,246,0.12);border-radius:6px;font-size:12px;color:#2563eb">
             📍 Zone: <b>${device.current_zone}</b>
           </div>`
        : `<div style="margin-top:6px;font-size:11px;color:#94a3b8;font-style:italic">No active zone</div>`;

      const contentHtml = device.current_content_title
        ? `<div style="margin-top:4px;padding:4px 8px;background:rgba(34,197,94,0.1);border-radius:6px;font-size:12px;color:#16a34a">
             🎬 Ad: <b>${device.current_content_title}</b>
           </div>`
        : `<div style="margin-top:4px;font-size:11px;color:#94a3b8;font-style:italic">No ad assigned</div>`;

      const typeLabel = device.device_type
        ? `<span style="font-size:10px;color:#64748b">${device.device_type.replace('_', ' ')}</span>`
        : '';
      const fleetLabel = device.fleet_name
        ? `<span style="font-size:10px;color:#64748b"> · ${device.fleet_name}</span>`
        : '';

      const popup = `
        <div style="font-family:Inter,sans-serif;min-width:210px;padding:2px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:2px">${device.name}</div>
          <div style="margin-bottom:6px">${typeLabel}${fleetLabel}</div>
          <div style="margin-bottom:6px">
            <span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;
              background:${device.status === 'ONLINE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};
              color:${device.status === 'ONLINE' ? '#22c55e' : '#ef4444'}">
              ${device.status}
            </span>
          </div>
          ${zoneHtml}
          ${contentHtml}
          <div style="font-size:10px;color:#94a3b8;margin-top:6px;border-top:1px solid #f1f5f9;padding-top:4px">
            ${device.latitude.toFixed(5)}, ${device.longitude.toFixed(5)}
            ${device.last_seen ? ` · ${new Date(device.last_seen).toLocaleTimeString()}` : ''}
          </div>
        </div>
      `;

      const existing = markersRef.current.get(device.device_id);
      if (existing) {
        existing.setLatLng([device.latitude, device.longitude]);
        existing.setIcon(icon);
        existing.setPopupContent(popup);
        // If user has this popup open, refresh it immediately so they see the new zone/content
        if (existing.isPopupOpen()) {
          existing.getPopup()?.update();
        }
      } else {
        const marker = L.marker([device.latitude, device.longitude], { icon })
          .bindPopup(popup, { maxWidth: 260 })
          .addTo(map);
        markersRef.current.set(device.device_id, marker);
      }
    });

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!seenIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [devices]);

  // Draw zone overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous zone overlays
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
