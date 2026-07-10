import { useState } from 'react';
import { cn } from '@camtraffic/utils';

export interface Camera {
  id: string;
  name: string;
  streamUrl: string;
  thumbnailUrl?: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
}

export interface CameraViewerProps {
  camera: Camera;
  showControls?: boolean;
  className?: string;
}

export function CameraViewer({ camera, showControls = true, className }: CameraViewerProps) {
  const [isLive, setIsLive] = useState(true);

  return (
    <div className={cn('ct-camera-viewer', className)}>
      <div className="ct-camera-viewer__header">
        <div>
          <h3 className="ct-camera-viewer__name">{camera.name}</h3>
          <p className="ct-camera-viewer__location">{camera.location}</p>
        </div>
        <span
          className={cn(
            'ct-camera-viewer__status',
            `ct-camera-viewer__status--${camera.status}`,
          )}
        >
          <span className="ct-camera-viewer__status-dot" />
          {camera.status}
        </span>
      </div>
      <div className="ct-camera-viewer__video">
        {isLive && camera.status === 'online' ? (
          <img
            src={camera.streamUrl}
            alt={`Live feed from ${camera.name}`}
            className="ct-camera-viewer__stream"
          />
        ) : camera.thumbnailUrl ? (
          <img
            src={camera.thumbnailUrl}
            alt={`Snapshot from ${camera.name}`}
            className="ct-camera-viewer__stream"
          />
        ) : (
          <div className="ct-camera-viewer__offline">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
              <path d="m1 1 22 22" />
            </svg>
            <p>Camera {camera.status}</p>
          </div>
        )}
      </div>
      {showControls && camera.status === 'online' ? (
        <div className="ct-camera-viewer__controls">
          <button
            type="button"
            className={cn(
              'ct-camera-viewer__control',
              isLive && 'ct-camera-viewer__control--active',
            )}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
          <button type="button" className="ct-camera-viewer__control">
            Snapshot
          </button>
        </div>
      ) : null}
    </div>
  );
}
