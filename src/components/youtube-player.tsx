"use client";

import { useState, useEffect } from "react";

interface YouTubePlayerProps {
  videoId: string;
  start?: number;
  title?: string;
  className?: string;
}

export function YouTubePlayer({ videoId, start = 0, title = "Video player", className = "" }: YouTubePlayerProps) {
  const [canEmbed, setCanEmbed] = useState<boolean | null>(null);
  const startSec = Math.floor(start);
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startSec}&autoplay=1`;

  useEffect(() => {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then((res) => setCanEmbed(res.ok))
      .catch(() => setCanEmbed(false));
  }, [videoId]);

  // Loading state
  if (canEmbed === null) {
    return (
      <div className={`rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Embeddable — use YouTube iframe
  if (canEmbed) {
    return (
      <div className={className}>
        <div className="rounded-lg overflow-hidden bg-black aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="border-0"
          />
        </div>
      </div>
    );
  }

  // Not embeddable — show "Watch on YouTube" button
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}${startSec ? `&t=${startSec}` : ""}`;

  return (
    <div className={className}>
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        Watch on YouTube
      </a>
    </div>
  );
}
