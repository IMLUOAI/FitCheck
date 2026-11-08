import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHeroMode, setHeroMode, type HeroMode } from "../lib/heroMode";

const MODE_QUERY_KEY = ["heroMode"] as const;

/** "weather" (bucket art) or "album" (shuffle user photos). */
export function useHeroMode() {
  return useQuery({
    queryKey: MODE_QUERY_KEY,
    queryFn: getHeroMode,
    staleTime: Infinity,
  });
}

export function useSetHeroMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: HeroMode) => setHeroMode(mode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MODE_QUERY_KEY });
    },
  });
}
