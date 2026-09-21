import { useState, useEffect, useRef } from 'react';
import { Film, Play, SkipForward, Layers, Clock, ShieldAlert, Sparkles, MapPin, ExternalLink, Image as ImageIcon } from 'lucide-react';
import type { PlaylistItem } from '../../types';

interface DeviceAdRotationCardProps {
  playlist?: PlaylistItem[];
  slotDuration?: number;
  currentZoneName?: string | null;
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  status?: string;
  locationName?: string;
  showInspectorHeader?: boolean;
}

export default function DeviceAdRotationCard({
  playlist = [],
  slotDuration = 3,
  currentZoneName,
  deviceId,
  deviceName,
  deviceType,
  status = 'ONLINE',
  locationName,
  showInspectorHeader = false,
}: DeviceAdRotationCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const playlistRef = useRef<PlaylistItem[]>(playlist);
  playlistRef.current = playlist;

  // Duration in milliseconds (3000ms by default)
  const slotMs = Math.max(1000, (slotDuration || 3) * 1000);

  // Serialized key of actual items and current zone to prevent unnecessary timer resets
  const playlistKey = (playlist || [])
    .map((p) => `${p.content_id ?? ''}_${p.campaign_id ?? ''}_${p.file_url ?? ''}`)
    .join('|') + `_${currentZoneName ?? ''}`;

  // Reset index when playlist contents or zone ACTUALLY changes
  useEffect(() => {
    // Always reset to 0 on zone/playlist change so new zone content starts immediately
    setCurrentIndex(0);
    setProgress(0);
    startTimeRef.current = Date.now();
    if (deviceId && currentZoneName) {
      console.log(`[PLAYER] ${deviceId}: switched to ${currentZoneName} playlist (${playlist.length} items)`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistKey]);

  useEffect(() => {
    const list = playlistRef.current;
    if (!list || list.length === 0) {
      setProgress(0);
      return;
    }

    startTimeRef.current = Date.now();
    const intervalMs = 50;

    timerRef.current = setInterval(() => {
      const currentList = playlistRef.current;
      if (!currentList || currentList.length === 0) {
        setProgress(0);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / slotMs) * 100);
      setProgress(pct);

      if (elapsed >= slotMs) {
        startTimeRef.current = Date.now();
        setProgress(0);
        if (currentList.length > 1) {
          setCurrentIndex((prev) => (prev + 1) % currentList.length);
        }
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playlistKey, slotMs]);

  const activeItem: PlaylistItem | undefined = playlist.length > 0 ? playlist[currentIndex] : undefined;
  const nextItem: PlaylistItem | undefined =
    playlist.length > 1 ? playlist[(currentIndex + 1) % playlist.length] : undefined;

  return (
    <div
      className="card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle decorative highlight */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 140,
          height: 140,
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Optional Top Inspector Header (for Dashboard live inspector) */}
      {showInspectorHeader && deviceId && (
        <div
          style={{
            paddingBottom: '14px',
            marginBottom: '14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--accent-blue)',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                {deviceId}
              </span>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                {deviceName || deviceId}
              </span>
            </div>
            {locationName && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <MapPin size={12} style={{ color: 'var(--accent-blue)' }} /> {locationName}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '99px',
                background: status === 'ONLINE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: status === 'ONLINE' ? 'var(--accent-green)' : 'var(--accent-red)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: status === 'ONLINE' ? '#22c55e' : '#ef4444',
                  boxShadow: status === 'ONLINE' ? '0 0 6px #22c55e' : 'none',
                }}
              />
              {status}
            </span>
            <a
              href={`/devices/${deviceId}`}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Open full telemetry page for this display"
            >
              Inspect <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      {/* Header with Zone & Slot Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '14px',
        }}
      >
        <div>
          <div
            className="card-title"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--text-primary)' }}
          >
            <Sparkles size={16} style={{ color: 'var(--accent-blue)' }} /> Live 3-Second Ad Rotation
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Current Zone: <strong style={{ color: 'var(--accent-purple)' }}>{currentZoneName || 'Transit / Outside Geofence'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '99px',
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--accent-blue)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={12} /> {slotDuration}s Slots
          </span>
          {playlist.length > 1 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '99px',
                background: 'rgba(34, 197, 94, 0.12)',
                color: 'var(--accent-green)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
              }}
            >
              {playlist.length} Rotating Ads
            </span>
          )}
        </div>
      </div>

      {/* Active Ad Screen Container */}
      {activeItem ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '180px',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {activeItem.file_url ? (
              (() => {
                const urlLower = (activeItem.file_url || '').toLowerCase();
                const isVideo = (activeItem.media_type && activeItem.media_type.toLowerCase().includes('video')) ||
                                /\.(mp4|webm|mov|avi|mkv)$/i.test(urlLower);
                return isVideo ? (
                  <video
                    key={`${activeItem.content_id ?? ''}_${activeItem.file_url}`}
                    src={activeItem.file_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    ref={(el) => {
                      if (el) {
                        el.muted = true;
                        el.play().catch((err) => {
                          console.debug('[AdRotation] Autoplay handled:', err);
                        });
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      e.currentTarget.muted = true;
                      e.currentTarget.play().catch(() => {});
                    }}
                    onError={() => {
                      console.warn('[AdRotation] Video error loading:', activeItem.file_url);
                      if (playlistRef.current.length > 1) {
                        setTimeout(() => {
                          setCurrentIndex((prev) => (prev + 1) % playlistRef.current.length);
                        }, 500);
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    key={`${activeItem.content_id ?? ''}_${activeItem.file_url}`}
                    src={activeItem.file_url}
                    alt={activeItem.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                );
              })()
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <Film size={32} style={{ marginBottom: 6 }} />
                <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>{activeItem.title}</span>
              </div>
            )}

            {/* Overlays on Ad Player */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                display: 'flex',
                gap: '6px',
                zIndex: 10,
              }}
            >
              <span
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(6px)',
                  color: '#22c55e',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                <Play size={10} fill="#22c55e" /> PLAYING NOW
              </span>
              {playlist.length > 1 && (
                <span
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(6px)',
                    color: '#cbd5e1',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Slot {currentIndex + 1} of {playlist.length}
                </span>
              )}
              {activeItem.content_id && (
                <span
                  style={{
                    background: 'rgba(56, 189, 248, 0.2)',
                    backdropFilter: 'blur(6px)',
                    color: '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                  }}
                  title="Authoritative Content Record ID in database"
                >
                  CNT-{String(activeItem.content_id).padStart(3, '0')}
                </span>
              )}
              {activeItem.campaign_id && (
                <span
                  style={{
                    background: 'rgba(168, 85, 247, 0.2)',
                    backdropFilter: 'blur(6px)',
                    color: '#c084fc',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                  }}
                  title="Associated Advertiser Campaign ID"
                >
                  CMP-{String(activeItem.campaign_id).padStart(3, '0')}
                </span>
              )}
              {activeItem.file_url && (
                <span
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(6px)',
                    color: (activeItem.media_type?.includes('video') || /\.(mp4|webm|mov|avi|mkv)$/i.test(activeItem.file_url || '')) ? '#38bdf8' : '#cbd5e1',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={`Media format: ${activeItem.media_type || 'auto'} | URL: ${activeItem.file_url}`}
                >
                  {(activeItem.media_type?.includes('video') || /\.(mp4|webm|mov|avi|mkv)$/i.test(activeItem.file_url || '')) ? (
                    <><Film size={10} color="#38bdf8" /> VIDEO</>
                  ) : (
                    <><ImageIcon size={10} color="#cbd5e1" /> IMAGE</>
                  )}
                </span>
              )}
            </div>

            {/* Title Gradient Ribbon */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '10px 14px',
                background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.95) 80%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '15px' }}>
                  {activeItem.title}
                </div>
                {activeItem.priority && (
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Priority: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{activeItem.priority}/10</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                {Math.max(0, ((slotMs - (progress / 100) * slotMs) / 1000)).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* 3-Second Visual Progress Bar */}
          <div style={{ marginTop: '2px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              <span>Slot Rotation Progress</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontWeight: 600 }}>
                {progress.toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '7px',
                background: 'var(--border)',
                borderRadius: '99px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))',
                  boxShadow: '0 0 8px rgba(56, 189, 248, 0.4)',
                  borderRadius: '99px',
                  transition: 'width 50ms linear',
                }}
              />
            </div>
          </div>

          {/* Next Up Preview */}
          {nextItem && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--bg-hover)',
                border: '1px dashed var(--border)',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <SkipForward size={14} style={{ color: 'var(--accent-blue)' }} />
                <span>Next Advertisement:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{nextItem.title}</strong>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>in 3s</span>
            </div>
          )}

          {/* Full Playlist Breakdown */}
          {playlist.length > 1 && (
            <div style={{ marginTop: '6px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Layers size={13} style={{ color: 'var(--accent-blue)' }} /> Device Rotation Sequence (
                {playlist.length} slots):
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                }}
              >
                {playlist.map((item, idx) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        background: isCurrent ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-hover)',
                        border: isCurrent
                          ? '1px solid rgba(56, 189, 248, 0.35)'
                          : '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: isCurrent ? 'var(--accent-blue)' : 'var(--border)',
                            color: isCurrent ? '#ffffff' : 'var(--text-secondary)',
                          }}
                        >
                          {idx + 1}
                        </span>
                        {item.content_id && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: isCurrent ? 'var(--accent-blue)' : 'var(--text-muted)',
                              background: isCurrent ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                            }}
                          >
                            CNT-{String(item.content_id).padStart(3, '0')}
                          </span>
                        )}
                        <span
                          style={{
                            color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: isCurrent ? 700 : 500,
                          }}
                        >
                          {item.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {item.priority && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: 'var(--accent-amber)',
                              fontWeight: 600,
                            }}
                          >
                            P{item.priority}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: isCurrent ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                          {slotDuration}s
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '13px',
            background: 'var(--bg-hover)',
            borderRadius: '8px',
            border: '1px dashed var(--border)',
          }}
        >
          <Film size={28} style={{ marginBottom: 6, color: 'var(--text-muted)' }} />
          <div>No active advertisement targeted for this zone</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Awaiting device movement into target coverage zone
          </div>
        </div>
      )}
    </div>
  );
}
