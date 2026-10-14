import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AddItemInput, ClothingItem } from "@dripcast/api";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { useAuthStore } from "../store/auth";

/** Toggle like/unlike for a wardrobe item, updating the cached list in place. */
export function useLikeItem() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?._id);

  return useMutation({
    mutationFn: async (item: ClothingItem): Promise<ClothingItem> => {
      if (!userId) throw new Error("Sign in to like items.");
      return item.likes.includes(userId)
        ? api.unlikeItem(item._id)
        : api.likeItem(item._id);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ClothingItem[]>(queryKeys.items, (prev) =>
        (prev ?? []).map((it) => (it._id === updated._id ? updated : it)),
      );
    },
  });
}

/** Add a wardrobe item, then refresh the closet list. */
export function useAddItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddItemInput) => api.addItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items });
    },
  });
}

/** Delete a wardrobe item, removing it from the cached list immediately. */
export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ClothingItem[]>(queryKeys.items, (prev) =>
        (prev ?? []).filter((it) => it._id !== id),
      );
    },
  });
}
