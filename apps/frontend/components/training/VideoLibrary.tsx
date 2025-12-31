"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { trainingVideos, getYouTubeThumbnailUrl } from "@/lib/training/videos";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/cn";

export function VideoLibrary() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const videos = useMemo(() => {
    if (!q) return trainingVideos;
    return trainingVideos.filter((v) => {
      const haystack = `${v.title} ${v.description} ${v.tags.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [q]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Video Tutorials</CardTitle>
          <CardDescription>
            All videos include transcripts below the player. Captions are enabled on YouTube.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-lg">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos (e.g., import, dashboards, integrations)…"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{video.title}</CardTitle>
                  <CardDescription>
                    {video.durationMinutes} min • {video.tags.map((t) => `#${t}`).join(" ")}
                  </CardDescription>
                </div>
                <div
                  className={cn(
                    "h-14 w-24 relative rounded-lg overflow-hidden border border-secondary-200",
                    "hidden sm:block"
                  )}
                >
                  <Image
                    src={getYouTubeThumbnailUrl(video.youtubeId)}
                    alt="Video thumbnail"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-700 mb-4">{video.description}</p>

              <div className="aspect-video w-full overflow-hidden rounded-xl border border-secondary-200">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${video.youtubeId}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-primary-700">
                  Transcript
                </summary>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-secondary-200 bg-secondary-50 p-4 text-xs text-secondary-800">
                  {video.transcript}
                </pre>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
