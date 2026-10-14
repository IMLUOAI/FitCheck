import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@dripcast/api";
import type {
  Battle,
  BattlePick,
  CreateBattleInput,
  CreateFitInput,
  Fit,
  GetBattlesParams,
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
