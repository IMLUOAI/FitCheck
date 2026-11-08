import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@dripcast/api";
import type {
  Battle,
  BattlePick,
  Comment,
  CreateBattleInput,
  CreateCommentInput,
  CreateFitInput,
  CreatePostInput,
  Fit,
  GalleryItem,
  GetBattlesParams,
  Post,
} from "@dripcast/api";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { useAuthStore } from "../store/auth";

/**
 * True when the backend doesn't have the social endpoints yet (the patch
 * hasn't been applied+redeployed). Screens use this to show a friendly
 * "coming soon" state instead of a spinner or crash.
 */
export function isBackendMissing(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

function requireAuth(): string {
  const userId = useAuthStore.getState().user?._id;
  if (!userId) throw new Error("Sign in first.");
  return userId;
}

/** Public fits feed, optionally filtered by owner. */
export function useFits(owner?: string) {
  return useQuery({
    queryKey: owner ? queryKeys.fitsByOwner(owner) : queryKeys.fits,
    queryFn: () => api.getFits(owner ? { owner, limit: 20 } : { limit: 20 }),
  });
}

/** Full fit history (up to 500) for the calendar view. */
export function useFitHistory(owner?: string) {
  return useQuery({
    queryKey: ["fits", "history", owner ?? "all"],
    queryFn: () => api.getFits(owner ? { owner, limit: 500 } : { limit: 500 }),
  });
}

/** Open (or closed) battles feed. */
export function useBattles(params: GetBattlesParams = { status: "open" }) {
  return useQuery({
    queryKey: queryKeys.battles(params.status),
    queryFn: () => api.getBattles({ ...params, limit: 20 }),
  });
}

/** Save an outfit as a fit. */
export function useCreateFit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFitInput) => {
      requireAuth();
      return api.createFit(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.fits });
    },
  });
}

/** Delete one of your fits. */
export function useDeleteFit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      requireAuth();
      return api.deleteFit(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.fits });
    },
  });
}

/** Toggle like on a fit, updating cached feeds in place. */
export function useLikeFit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fit: Fit) => {
      const userId = requireAuth();
      return fit.likes.includes(userId)
        ? api.unlikeFit(fit._id)
        : api.likeFit(fit._id);
    },
    onSuccess: (updated) => {
      for (const key of [queryKeys.fits, queryKeys.fitsByOwner(updatedOwnerOf(updated))]) {
        queryClient.setQueryData<Fit[]>(key, (prev) =>
          (prev ?? []).map((f) => (f._id === updated._id ? updated : f)),
        );
      }
    },
  });
}

function updatedOwnerOf(fit: Fit): string {
  return typeof fit.owner === "string" ? fit.owner : fit.owner._id;
}

/** Vote A or B on a battle, updating the cached feed in place. */
export function useVoteBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pick }: { id: string; pick: BattlePick }) => {
      requireAuth();
      return api.voteBattle(id, pick);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Battle[]>(queryKeys.battles("open"), (prev) =>
        (prev ?? []).map((b) => (b._id === updated._id ? updated : b)),
      );
    },
  });
}

/** Create a battle from two fits. */
export function useCreateBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBattleInput) => {
      requireAuth();
      return api.createBattle(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.battles("open") });
    },
  });
}

/** Comments on one fit, post or album photo, oldest first. Pass enabled=false to hold the fetch. */
export function useComments(targetType: "fit" | "post" | "gallery", targetId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.comments(targetType, targetId),
    queryFn: () => api.getComments({ targetType, targetId, limit: 50 }),
    enabled,
  });
}

/** Post a comment; refreshes the thread and the target's count. */
export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => {
      requireAuth();
      return api.addComment(input);
    },
    onSuccess: (comment) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments(comment.targetType, comment.targetId),
      });
      void queryClient.invalidateQueries({ queryKey: ["fits"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      void queryClient.invalidateQueries({ queryKey: ["gallery"] });
    },
  });
}

/** Delete a comment (own, or on your own fit/post/album photo). */
export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; targetType: "fit" | "post" | "gallery"; targetId: string }) => {
      requireAuth();
      return api.deleteComment(vars.id);
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments(vars.targetType, vars.targetId),
      });
      void queryClient.invalidateQueries({ queryKey: ["fits"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      void queryClient.invalidateQueries({ queryKey: ["gallery"] });
    },
  });
}

/** Public album photos from other users (Discover), newest first. */
export function usePublicGallery() {
  return useQuery({
    queryKey: queryKeys.publicGallery,
    queryFn: () => api.getPublicGallery(),
  });
}

/** Flip one of your album photos public/private, updating cached lists in place. */
export function useSetGalleryVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; isPublic: boolean }) => {
      requireAuth();
      return api.setGalleryVisibility(vars.id, vars.isPublic);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<GalleryItem[]>(queryKeys.gallery, (prev) =>
        (prev ?? []).map((g) => (g._id === updated._id ? updated : g)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicGallery });
    },
  });
}

/** Toggle like on a public album photo, updating the cached Discover feed in place. */
export function useLikeGalleryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: GalleryItem) => {
      const userId = requireAuth();
      return item.likes.includes(userId)
        ? api.unlikeGalleryItem(item._id)
        : api.likeGalleryItem(item._id);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<GalleryItem[]>(queryKeys.publicGallery, (prev) =>
        (prev ?? []).map((g) => (g._id === updated._id ? updated : g)),
      );
    },
  });
}
export function usePosts(owner?: string) {
  return useQuery({
    queryKey: owner ? queryKeys.postsByOwner(owner) : queryKeys.posts,
    queryFn: () => api.getPosts(owner ? { owner, limit: 20 } : { limit: 20 }),
  });
}

/** Share a shelf item to the community. */
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => {
      requireAuth();
      return api.createPost(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

/** Delete one of your shelf posts (and its comments). */
export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      requireAuth();
      return api.deletePost(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

/** Toggle like on a shelf post, updating cached feeds in place. */
export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: Post) => {
      const userId = requireAuth();
      return post.likes.includes(userId)
        ? api.unlikePost(post._id)
        : api.likePost(post._id);
    },
    onSuccess: (updated) => {
      for (const key of [queryKeys.posts, queryKeys.postsByOwner(postOwnerOf(updated))]) {
        queryClient.setQueryData<Post[]>(key, (prev) =>
          (prev ?? []).map((p) => (p._id === updated._id ? updated : p)),
        );
      }
    },
  });
}

function postOwnerOf(post: Post): string {
  return typeof post.owner === "string" ? post.owner : post.owner._id;
}
