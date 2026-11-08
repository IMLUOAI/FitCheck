import { useEffect, useMemo, useState } from "react";
import {
  dirtyItemIds,
  getLastLaundryDay,
  markLaundryDay as persistLaundryDay,
} from "../lib/laundry";
import { useFitHistory } from "./useSocial";
import { useAuthStore } from "../store/auth";

/**
 * Laundry-aware wear state. Wear is derived automatically from fit history
 * (a fit's items + createdAt = worn that day); "dirty" means worn since the
 * last laundry day, which is a single local "YYYY-MM-DD" in AsyncStorage.
 */
export function useLaundry() {
  const userId = useAuthStore((s) => s.user?._id);
  const fitsQuery = useFitHistory(userId);
  const [lastLaundryDay, setLastLaundryDay] = useState<string | null>(null);
  const [dayPending, setDayPending] = useState(true);

  useEffect(() => {
    let live = true;
    setDayPending(true);
    void getLastLaundryDay().then((day) => {
      if (live) {
        setLastLaundryDay(day);
        setDayPending(false);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  const markLaundryDay = async () => {
    const today = await persistLaundryDay();
    setLastLaundryDay(today);
  };

  const dirtyIds = useMemo(() => {
    if (!userId) return new Set<string>();
    return dirtyItemIds(fitsQuery.data ?? [], lastLaundryDay);
  }, [userId, fitsQuery.data, lastLaundryDay]);

  return {
    lastLaundryDay,
    dirtyIds,
    isPending: dayPending || fitsQuery.isPending,
    markLaundryDay,
  };
}
