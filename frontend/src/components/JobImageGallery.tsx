'use client';
import React, { useEffect, useState } from 'react';

type JobImageGalleryProps = {
  images: string[];
};

export default function JobImageGallery({ images }: JobImageGalleryProps) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeImage) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveImage(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeImage]);

  if (!images.length) return null;

  return (
    <div className="job-gallery">
      <div className="job-gallery-grid">
        {images.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            className="job-gallery-thumb"
            onClick={() => setActiveImage(src)}
            aria-label={`Open image ${index + 1}`}
          >
            <img src={src} alt={`Job image ${index + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {activeImage && (
        <div className="job-gallery-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="job-gallery-backdrop"
            onClick={() => setActiveImage(null)}
            aria-label="Close image"
          />
          <div className="job-gallery-modal-content">
            <button
              type="button"
              className="icon-button job-gallery-close"
              onClick={() => setActiveImage(null)}
              aria-label="Close image"
            >
              x
            </button>
            <img src={activeImage} alt="Job image preview" />
            <a
              className="job-gallery-open"
              href={activeImage}
              target="_blank"
              rel="noreferrer"
            >
              Open full size
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
