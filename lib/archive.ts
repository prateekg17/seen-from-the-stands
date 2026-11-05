import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const stableId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const coverage = z.enum(["complete", "partial", "unknown"]);

const entitySchema = z.object({
  id: stableId,
  name: z.string().trim().min(1),
  providerId: z.string().trim().min(1).optional(),
});

const entitiesSchema = z.object({
  teams: z.array(entitySchema),
  players: z.array(entitySchema),
  competitions: z.array(entitySchema),
  venues: z.array(entitySchema),
});

const scoreSchema = z.object({
  home: z.number().int().min(0),
  away: z.number().int().min(0),
});

const eventSchema = z.object({
  minute: z.number().int().min(0).nullable(),
  type: z.enum(["goal", "card", "substitution", "other"]),
  teamId: stableId.nullable(),
  playerId: stableId.nullable(),
  description: z.string().trim().min(1).nullable(),
});

const statisticSchema = z.object({
  name: z.string().trim().min(1),
  home: z.number().min(0).nullable(),
  away: z.number().min(0).nullable(),
});

const matchSchema = z.object({
  id: stableId,
  date: z.iso.date(),
  season: z.string().trim().min(1).nullable(),
  status: z.enum(["completed", "unfinished", "abandoned", "disputed"]),
  homeTeamId: stableId,
  awayTeamId: stableId,
  competitionId: stableId,
  venueId: stableId.nullable(),
  score: scoreSchema.nullable(),
  extraTimePlayed: z.boolean().nullable(),
  shootout: scoreSchema.nullable(),
  appearances: z.object({
    coverage,
    playerIds: z.array(stableId),
    evidence: z.string().trim().min(1).nullable(),
  }),
  events: z.object({
    coverage,
    items: z.array(eventSchema),
  }).nullable(),
  statistics: z.object({
    coverage,
    items: z.array(statisticSchema),
  }).nullable(),
  providerFixtureId: z.string().trim().min(1).optional(),
  provenance: z.object({
    kind: z.literal("manual"),
    reference: z.string().trim().min(1).optional(),
  }),
}).superRefine((match, context) => {
  if (match.homeTeamId === match.awayTeamId) {
    context.addIssue({
      code: "custom",
      path: ["awayTeamId"],
      message: "A team cannot play itself.",
    });
  }
  if (match.status === "completed" && match.score === null) {
    context.addIssue({
      code: "custom",
      path: ["score"],
      message: "Completed matches require a final score excluding shootout kicks.",
    });
  }
  if (match.shootout !== null && match.score === null) {
    context.addIssue({
      code: "custom",
      path: ["shootout"],
      message: "A shootout score requires a match score.",
    });
  }
  if (new Set(match.appearances.playerIds).size !== match.appearances.playerIds.length) {
    context.addIssue({
      code: "custom",
      path: ["appearances", "playerIds"],
      message: "A player's appearance can only be recorded once per match.",
    });
  }
  if (match.appearances.coverage === "unknown" && match.appearances.playerIds.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["appearances", "coverage"],
      message: "Unknown appearance coverage cannot contain player records.",
    });
  }
  if (match.appearances.playerIds.length > 0 && match.appearances.evidence === null) {
    context.addIssue({
      code: "custom",
      path: ["appearances", "evidence"],
      message: "Confirmed player appearances require an evidence reference.",
    });
  }
});

export type Entity = z.infer<typeof entitySchema>;
export type Match = z.infer<typeof matchSchema>;
export type ArchiveEntities = z.infer<typeof entitiesSchema>;
type Score = z.infer<typeof scoreSchema>;

export type Archive = {
  entities: ArchiveEntities;
  matches: Match[];
};

export function parseArchive(input: { entities: unknown; matches: unknown[] }): Archive {
  const entities = entitiesSchema.parse(input.entities);
  const matches = input.matches.map((match) => matchSchema.parse(match));
  const collections = Object.entries(entities) as [keyof ArchiveEntities, Entity[]][];

  for (const [collectionName, records] of collections) {
    const ids = records.map((record) => record.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error(`Duplicate IDs in ${collectionName}.`);
    }
    const providerIds = records.flatMap((record) => record.providerId ? [record.providerId] : []);
    if (new Set(providerIds).size !== providerIds.length) {
      throw new Error(`Duplicate provider IDs in ${collectionName}.`);
    }
  }
  if (new Set(matches.map((match) => match.id)).size !== matches.length) {
    throw new Error("Duplicate match IDs.");
  }
  const providerFixtureIds = matches.flatMap((match) => match.providerFixtureId ? [match.providerFixtureId] : []);
  if (new Set(providerFixtureIds).size !== providerFixtureIds.length) {
    throw new Error("Duplicate provider fixture IDs.");
  }

  const teamIds = new Set(entities.teams.map((team) => team.id));
  const playerIds = new Set(entities.players.map((player) => player.id));
  const competitionIds = new Set(entities.competitions.map((item) => item.id));
  const venueIds = new Set(entities.venues.map((venue) => venue.id));

  for (const match of matches) {
    for (const [id, label, knownIds] of [
      [match.homeTeamId, "home team", teamIds],
      [match.awayTeamId, "away team", teamIds],
      [match.competitionId, "competition", competitionIds],
      ...(match.venueId === null ? [] : [[match.venueId, "venue", venueIds]]),
      ...match.appearances.playerIds.map((id) => [id, "player", playerIds]),
    ] as [string, string, Set<string>][]) {
      if (!knownIds.has(id)) {
        throw new Error(`Match "${match.id}" references an unknown ${label} ID "${id}".`);
      }
    }
    for (const event of match.events?.items ?? []) {
      if (event.teamId !== null && !teamIds.has(event.teamId)) {
        throw new Error(`Match "${match.id}" event references an unknown team ID "${event.teamId}".`);
      }
      if (event.playerId !== null && !playerIds.has(event.playerId)) {
        throw new Error(`Match "${match.id}" event references an unknown player ID "${event.playerId}".`);
      }
    }
  }

  return { entities, matches };
}

function readJson<T>(filePath: string): T {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${path.relative(process.cwd(), filePath)}: ${detail}`);
  }
}

export function loadArchive(root = process.cwd()): Archive {
  const dataDirectory = path.join(root, "data");
  const matchDirectory = path.join(dataDirectory, "matches");
  const entities = readJson<unknown>(path.join(dataDirectory, "entities.json"));
  const files = readdirSync(matchDirectory)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const matches = files.map((file) => {
    const match = readJson<unknown>(path.join(matchDirectory, file));
    const parsedId = matchSchema.shape.id.parse(
      typeof match === "object" && match !== null && "id" in match
        ? (match as { id: unknown }).id
        : undefined,
    );
    if (`${parsedId}.json` !== file) {
      throw new Error(`Match file "${file}" must be named "${parsedId}.json".`);
    }
    return match;
  });

  return parseArchive({ entities, matches });
}

export type ArchiveSummary = {
  matchCount: number;
  completedMatchCount: number;
  goals: number;
  teamCount: number;
  venueCount: number;
  competitionCount: number;
  appearanceEvidenceCount: number;
  mostWatchedTeams: { id: string; count: number }[];
  mostSeenPlayers: { id: string; count: number }[];
  highestScoringMatches: { id: string; goals: number }[];
};

function leaders(counts: Map<string, number>): { id: string; count: number }[] {
  const highest = [...counts.values()].reduce((max, count) => Math.max(max, count), 0);
  if (highest === 0) return [];
  return [...counts]
    .filter(([, count]) => count === highest)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function summarizeArchive(matches: Match[]): ArchiveSummary {
  const completed = matches.filter(
    (match): match is Match & { score: Score } => match.status === "completed" && match.score !== null,
  );
  const teamCounts = new Map<string, number>();
  const playerCounts = new Map<string, number>();
  const scoringRecords = completed.map((match) => ({
    id: match.id,
    goals: match.score!.home + match.score!.away,
  }));
  const mostGoals = scoringRecords.reduce((max, record) => Math.max(max, record.goals), 0);

  for (const match of matches) {
    for (const teamId of new Set([match.homeTeamId, match.awayTeamId])) {
      teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);
    }
    for (const playerId of match.appearances.playerIds) {
      playerCounts.set(playerId, (playerCounts.get(playerId) ?? 0) + 1);
    }
  }

  return {
    matchCount: matches.length,
    completedMatchCount: completed.length,
    goals: completed.reduce((total, match) => total + match.score.home + match.score.away, 0),
    teamCount: new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId])).size,
    venueCount: new Set(matches.flatMap((match) => match.venueId ? [match.venueId] : [])).size,
    competitionCount: new Set(matches.map((match) => match.competitionId)).size,
    appearanceEvidenceCount: matches.filter((match) => match.appearances.coverage !== "unknown").length,
    mostWatchedTeams: leaders(teamCounts),
    mostSeenPlayers: leaders(playerCounts),
    highestScoringMatches: scoringRecords
      .filter((record) => record.goals === mostGoals)
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
