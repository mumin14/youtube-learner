"use client";

import { useEffect, useState, useCallback } from "react";
import type { ProcessingStatus } from "@/types";

export function useProcessingStatus() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({
    status: "idle",
    totalChunks: 0,
    processedChunks: 0,
    progress: 0,
  });

  const startProcessing = useCallback(async () => {
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start processing");
      }

      setJobId(data.jobId);
      setStatus({ status: "pending", totalChunks: 0, processedChunks: 0, progress: 0 });
      return data.jobId as number;
    } catch (err) {
      setStatus({
        status: "error",
        totalChunks: 0,
        processedChunks: 0,
        progress: 0,
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(
      `/api/process/status?jobId=${jobId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data);
      if (data.status === "completed" || data.status === "error") {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [jobId]);

  const reset = useCallback(() => {
    setJobId(null);
    setStatus({ status: "idle", totalChunks: 0, processedChunks: 0, progress: 0 });
  }, []);

  return { status, startProcessing, reset };
}
