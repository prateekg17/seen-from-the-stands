import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MatchFilters from "../components/match-filters";
import { parseArchive, summarizeArchive } from "../lib/archive";

const entities = {
  teams: [
    { id: "north-fc", name: "North FC" },
    { id: "south-fc", name: "South FC" },
    { id: "east-fc", name: "East FC" },
  ],
  players: [
    { id: "alex-forward", name: "Alex Forward" },
    { id: "sam-midfielder", name: "Sam Midfielder" },
  ],
  competitions: [{ id: "cup", name: "Cup" }],
  venues: [{ id: "main-ground", name: "Main Ground" }],
};

function syntheticMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: "match-one",
    date: "2024-01-02",
    season: "2023/24",
    status: "completed",
    homeTeamId: "north-fc",
    awayTeamId: "south-fc",
    competitionId: "cup",
    venueId: "main-ground",
    score: { home: 2, away: 1 },
    extraTimePlayed: false,
    shootout: null,
    appearances: { coverage: "complete", playerIds: ["alex-forward"], evidence: "Synthetic test evidence" },
    events: null,
    statistics: null,
    provenance: { kind: "manual" },
    ...overrides,
  };
}

function parse(matches: unknown[]) {
  return parseArchive({ entities, matches });
}

test("counts completed match goals but not shootout kicks and retains extra-time score", () => {
  const archive = parse([
    syntheticMatch(),
    syntheticMatch({
      id: "match-two",
      date: "2024-02-02",
      homeTeamId: "east-fc",
      awayTeamId: "north-fc",
      score: { home: 2, away: 2 },
      extraTimePlayed: true,
      shootout: { home: 5, away: 4 },
      appearances: { coverage: "partial", playerIds: ["alex-forward", "sam-midfielder"], evidence: "Synthetic test evidence" },
    }),
    syntheticMatch({
      id: "match-three",
      date: "2024-03-02",
      homeTeamId: "south-fc",
      awayTeamId: "east-fc",
      status: "abandoned",
      score: null,
      extraTimePlayed: null,
      appearances: { coverage: "unknown", playerIds: [], evidence: null },
    }),
  ]);
  const summary = summarizeArchive(archive.matches);

  assert.equal(summary.matchCount, 3);
  assert.equal(summary.completedMatchCount, 2);
  assert.equal(summary.goals, 7);
  assert.deepEqual(summary.highestScoringMatches, [{ id: "match-two", goals: 4 }]);
  assert.equal(summary.appearanceEvidenceCount, 2);
});

test("shows all tied teams and players rather than selecting one", () => {
  const archive = parse([
    syntheticMatch(),
    syntheticMatch({
      id: "match-two",
      date: "2024-02-02",
      homeTeamId: "north-fc",
      awayTeamId: "south-fc",
      score: { home: 0, away: 0 },
      appearances: { coverage: "partial", playerIds: ["sam-midfielder"], evidence: "Synthetic test evidence" },
    }),
  ]);
  const summary = summarizeArchive(archive.matches);

  assert.deepEqual(summary.mostWatchedTeams, [
    { id: "north-fc", count: 2 },
    { id: "south-fc", count: 2 },
  ]);
  assert.deepEqual(summary.mostSeenPlayers, [
    { id: "alex-forward", count: 1 },
    { id: "sam-midfielder", count: 1 },
  ]);
});

test("rejects duplicate match appearances and unknown entity references", () => {
  assert.throws(
    () => parse([syntheticMatch({ appearances: { coverage: "complete", playerIds: ["alex-forward", "alex-forward"], evidence: "Synthetic test evidence" } })]),
    /only be recorded once/,
  );
  assert.throws(
    () => parse([syntheticMatch({ homeTeamId: "missing-team" })]),
    /unknown home team ID/,
  );
});

test("rejects duplicate provider identities instead of merging records by name", () => {
  const duplicatedEntities = {
    ...entities,
    teams: [
      { id: "north-fc", name: "North FC", providerId: "provider-1" },
      { id: "south-fc", name: "South FC", providerId: "provider-1" },
      { id: "east-fc", name: "East FC" },
    ],
  };
  assert.throws(
    () => parseArchive({ entities: duplicatedEntities, matches: [syntheticMatch()] }),
    /Duplicate provider IDs in teams/,
  );
});

test("requires completed scores and keeps unknown appearances empty", () => {
  assert.throws(() => parse([syntheticMatch({ score: null })]), /Completed matches require a final score/);
  assert.throws(
    () => parse([syntheticMatch({ appearances: { coverage: "unknown", playerIds: ["alex-forward"], evidence: "Synthetic test evidence" } })]),
    /Unknown appearance coverage cannot contain player records/,
  );
  assert.throws(
    () => parse([syntheticMatch({ appearances: { coverage: "partial", playerIds: ["alex-forward"], evidence: null } })]),
    /Confirmed player appearances require an evidence reference/,
  );
});

test("partial and unknown appearance lists keep the ranking incomplete", () => {
  for (const coverage of ["partial", "unknown"]) {
    const archive = parse([syntheticMatch({
      appearances: { coverage, playerIds: [], evidence: null },
    })]);
    assert.equal(summarizeArchive(archive.matches).hasIncompleteAppearances, true);
  }
  assert.equal(summarizeArchive(parse([syntheticMatch()]).matches).hasIncompleteAppearances, false);
  assert.equal(summarizeArchive([]).hasIncompleteAppearances, false);
});

test("renders non-completed recorded scores and statuses without counting their goals", () => {
  for (const status of ["unfinished", "abandoned", "disputed"]) {
    const archive = parse([syntheticMatch({ status, score: { home: 1, away: 0 } })]);
    const markup = renderToStaticMarkup(createElement(MatchFilters, archive));
    assert.match(markup, /aria-label="1 to 0">1 – 0/);
    assert.match(markup, new RegExp(`class="status-pill">${status}`));
    assert.equal(summarizeArchive(archive.matches).goals, 0);
    assert.deepEqual(summarizeArchive(archive.matches).highestScoringMatches, []);
  }
});
