import { useState } from 'react';
import { cn } from '@camtraffic/utils';

export interface Evidence {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  timestamp: string;
  location?: string;
  description?: string;
}

export interface EvidenceViewerProps {
  evidence: Evidence[];
  className?: string;
}

export function EvidenceViewer({ evidence, className }: EvidenceViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const current = evidence[selectedIndex];

  if (evidence.length === 0) {
    return (
      <div className={cn('ct-evidence-viewer', 'ct-evidence-viewer--empty', className)}>
        <p>No evidence available</p>
      </div>
    );
  }

  return (
    <div className={cn('ct-evidence-viewer', className)}>
      <div className="ct-evidence-viewer__main">
        <img
          src={current.imageUrl}
          alt={current.description || `Evidence ${current.id}`}
          className="ct-evidence-viewer__image"
        />
        <div className="ct-evidence-viewer__controls">
          <button
            type="button"
            className="ct-evidence-viewer__nav"
            onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
            disabled={selectedIndex === 0}
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="ct-evidence-viewer__counter">
            {selectedIndex + 1} / {evidence.length}
          </span>
          <button
            type="button"
            className="ct-evidence-viewer__nav"
            onClick={() => setSelectedIndex((i) => Math.min(evidence.length - 1, i + 1))}
            disabled={selectedIndex === evidence.length - 1}
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div className="ct-evidence-viewer__details">
        <div className="ct-evidence-viewer__meta">
          <time className="ct-evidence-viewer__timestamp">{current.timestamp}</time>
          {current.location ? (
            <span className="ct-evidence-viewer__location">{current.location}</span>
          ) : null}
        </div>
        {current.description ? (
          <p className="ct-evidence-viewer__description">{current.description}</p>
        ) : null}
      </div>
      {evidence.length > 1 ? (
        <div className="ct-evidence-viewer__thumbnails">
          {evidence.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'ct-evidence-viewer__thumbnail',
                index === selectedIndex && 'ct-evidence-viewer__thumbnail--active',
              )}
              onClick={() => setSelectedIndex(index)}
            >
              <img
                src={item.thumbnailUrl || item.imageUrl}
                alt={`Thumbnail ${index + 1}`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
