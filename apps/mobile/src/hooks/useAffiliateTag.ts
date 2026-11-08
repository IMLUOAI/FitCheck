import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAffiliateTag,
  setAffiliateTag,
} from "../lib/affiliate";

const TAG_QUERY_KEY = ["affiliateTag"] as const;

/** The saved Amazon Associates tag (null when unset). */
export function useAffiliateTag() {
  return useQuery({
    queryKey: TAG_QUERY_KEY,
    queryFn: getAffiliateTag,
    staleTime: Infinity,
  });
}

export function useSetAffiliateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tag: string | null) => setAffiliateTag(tag),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TAG_QUERY_KEY });
    },
  });
}
