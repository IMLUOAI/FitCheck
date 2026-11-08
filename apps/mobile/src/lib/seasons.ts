/**
 * Battle seasons (roadmap feature #6, client-side v1): calendar-month
 * seasons with a live leaderboard computed from battle votes.
 *
 * No backend changes — seasons are date windows and the leaderboard is
 * tallied from GET /battles (votesA/votesB per fit). A server-authoritative
 * version with anti-cheat can replace this later without changing the UI.
 */
import type { Battle, BattlePick, Fit } from "@dripcast/api";
import { battleFit, fitOwnerProfile } from "@dripcast/api";

export interface Season {
  /** "2026-10" */
  id: string;
  /** "October 2026" */
  label: string;
  start: Date;
  end: Date;
}

export function seasonForDate(d: Date): Season {
  const y = d.getFullYear();
  const m = d.getMonth();
  return {
    id: `${y}-${String(m + 1).padStart(2, "0")}`,
    label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    start: new Date(y, m, 1),
    end: new Date(y, m + 1, 0, 23, 59, 59, 999),
  };
}

export function seasonLabel(id: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(id);
  if (!m) return id;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function currentSeasonId(now: Date = new Date()): string {
  return seasonForDate(now).id;
}

export function daysLeftInSeason(now: Date = new Date()): number {
  const s = seasonForDate(now);
  return Math.max(0, Math.ceil((s.end.getTime() - now.getTime()) / 86_400_000));
}

function fitIdOf(battle: Battle, side: BattlePick): string {
  const fit = side === "A" ? battle.fitA : battle.fitB;
  return typeof fit === "string" ? fit : fit._id;
}

/** Battles created inside a season window. */
export function seasonBattles(battles: Battle[], seasonId: string): Battle[] {
  return battles.filter((b) => {
    const d = new Date(b.createdAt);
    return !isNaN(d.getTime()) && seasonForDate(d).id === seasonId;
  });
}

/** Season ids that have at least one battle, newest first. */
export function seasonIdsWithBattles(battles: Battle[]): string[] {
  const ids = new Set<string>();
  for (const b of battles) {
    const d = new Date(b.createdAt);
    if (!isNaN(d.getTime())) ids.add(seasonForDate(d).id);
  }
  return [...ids].sort().reverse();
}

export interface LeaderboardEntry {
  fitId: string;
  fit: Fit | null;
  ownerName: string;
  votes: number;
  wins: number;
  battles: number;
}

/**
 * Rank fits by votes earned in the given battles. A win is a battle where
 * the fit's side finished with strictly more votes.
 */
export function buildLeaderboard(battles: Battle[]): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  const bump = (battle: Battle, side: BattlePick) => {
    const fitId = fitIdOf(battle, side);
    const votes = side === "A" ? battle.votesA : battle.votesB;
    const otherVotes = side === "A" ? battle.votesB : battle.votesA;
    let entry = map.get(fitId);
    if (!entry) {
      const fit = battleFit(battle, side);
      entry = {
        fitId,
        fit,
        ownerName: fit ? (fitOwnerProfile(fit)?.name ?? "Someone") : "Someone",
        votes: 0,
        wins: 0,
        battles: 0,
      };
      map.set(fitId, entry);
    }
    entry.votes += votes;
    entry.battles += 1;
    if (votes > otherVotes) entry.wins += 1;
  };
  for (const b of battles) {
    bump(b, "A");
    bump(b, "B");
  }
  return [...map.values()].sort((a, b) => b.votes - a.votes || b.wins - a.wins);
}
