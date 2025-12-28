import { useState, useEffect, useCallback } from "react";
import { useFieldWorkStore } from "@/stores/leads.store";

export function useFieldWork() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const {
    isOffline,
    pendingSync,
    lastSyncTime,
    currentLocation,
    assignedLeadsCount,
    todayTasksCount,
    setOfflineStatus,
    addPendingSync,
    removePendingSync,
    clearPendingSync,
    setCurrentLocation,
    setAssignedLeadsCount,
    setTodayTasksCount,
    updateLastSyncTime,
  } = useFieldWorkStore();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineStatus(false);
      setWasOffline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineStatus(true);
    };

    setIsOnline(navigator.onLine);
    setOfflineStatus(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOfflineStatus]);

  useEffect(() => {
    if (wasOffline && isOnline && pendingSync.length > 0) {
      syncPendingChanges();
    }
  }, [wasOffline, isOnline]);

  const syncPendingChanges = useCallback(async () => {
    if (pendingSync.length === 0 || !isOnline) return;

    console.log(`Syncing ${pendingSync.length} pending changes...`);

    for (const lead of pendingSync) {
      try {
        await fetch("/api/leads/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lead),
        });
        removePendingSync(lead.id);
      } catch (err) {
        console.error("Failed to sync lead:", lead.id, err);
      }
    }

    updateLastSyncTime();
    setWasOffline(false);
  }, [pendingSync, isOnline, removePendingSync, updateLastSyncTime]);

  const getCurrentLocation = useCallback(
    (): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported"));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation(position);
            resolve(position);
          },
          (error) => {
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      });
    },
    [setCurrentLocation]
  );

  const watchLocation = useCallback((): number | null => {
    if (!navigator.geolocation) return null;

    return navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation(position);
      },
      (error) => {
        console.error("Location watch error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, [setCurrentLocation]);

  const formatLastSync = useCallback(() => {
    if (!lastSyncTime) return "Never synced";
    const date = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }, [lastSyncTime]);

  return {
    isOnline: isOnline && !isOffline,
    isOffline,
    wasOffline,
    pendingSyncCount: pendingSync.length,
    lastSyncTime,
    lastSyncFormatted: formatLastSync(),
    currentLocation,
    assignedLeadsCount,
    todayTasksCount,
    syncPendingChanges,
    getCurrentLocation,
    watchLocation,
    setAssignedLeadsCount,
    setTodayTasksCount,
    addPendingSync,
  };
}

export function useOfflineSync<T>(
  fetchData: () => Promise<T>,
  syncData: (data: T) => Promise<void>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOffline, addPendingSync } = useFieldWorkStore();

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchData();
      setData(result);
    } catch (err) {
      if (isOffline) {
        console.warn("Offline - data may be stale");
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      }
    } finally {
      setLoading(false);
    }
  }, [fetchData, isOffline]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const save = useCallback(
    async (dataToSave: T) => {
      if (isOffline) {
        addPendingSync(dataToSave as any);
        setData(dataToSave);
        return;
      }

      try {
        await syncData(dataToSave);
        setData(dataToSave);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
        throw err;
      }
    },
    [syncData, isOffline, addPendingSync]
  );

  return { data, loading, error, refetch: fetch, save };
}
