"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArchiveEntities, Match } from "@/lib/archive";

type Props = {
  readonly matches: Match[];
  readonly entities: ArchiveEntities;
};

const unknownSeason = "__unknown__";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

type MatchResultListProps = {
  readonly matches: Match[];
  readonly filteredMatches: Match[];
  readonly teamNames: ReadonlyMap<string, string>;
  readonly competitionNames: ReadonlyMap<string, string>;
};

function MatchResultList({
  matches,
  filteredMatches,
  teamNames,
  competitionNames,
}: MatchResultListProps) {
  if (matches.length === 0) {
    return (
      <section className="empty-state">
        <h2>No matches in the book yet</h2>
        <p>This is a record of games watched in person, not a calendar of every fixture played.</p>
      </section>
    );
  }

  if (filteredMatches.length === 0) {
    return (
      <section className="empty-state">
        <h2>No matching matches</h2>
        <p>Try changing a filter or reset them to see the full archive.</p>
      </section>
    );
  }

  return (
    <div className="match-list">
      {filteredMatches.map((match) => {
        const home = teamNames.get(match.homeTeamId) ?? match.homeTeamId;
        const away = teamNames.get(match.awayTeamId) ?? match.awayTeamId;
        const competitionName = competitionNames.get(match.competitionId) ?? match.competitionId;
        const isCompleted = match.status === "completed" && match.score !== null;
        const scoreLabel = match.score !== null
          ? `${match.score.home} to ${match.score.away}`
          : match.status;
        const scoreText = match.score !== null
          ? `${match.score.home} – ${match.score.away}`
          : "—";

        return (
          <Link className="match-row" href={`/matches/${match.id}/`} key={match.id}>
            <span className="match-date">{formatDate(match.date)}<br />{match.season ?? "Season not recorded"}</span>
            <span className="match-teams">
              <span>{home}</span>
              <span className="score" aria-label={scoreLabel}>{scoreText}</span>
              <span>{away}</span>
            </span>
            <span className="match-meta">
              {competitionName}
              {!isCompleted && <><br /><span className="status-pill">{match.status}</span></>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function MatchFilters({ matches, entities }: Props) {
  const [season, setSeason] = useState("");
  const [team, setTeam] = useState("");
  const [competition, setCompetition] = useState("");
  const teamNames = new Map(entities.teams.map((record) => [record.id, record.name]));
  const competitionNames = new Map(entities.competitions.map((record) => [record.id, record.name]));
  const seasons = [...new Set(matches.flatMap((match) => match.season ? [match.season] : []))]
    .sort((a, b) => a.localeCompare(b))
    .reverse();
  const teams = [...new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]))]
    .sort((a, b) => (teamNames.get(a) ?? a).localeCompare(teamNames.get(b) ?? b));
  const competitions = [...new Set(matches.map((match) => match.competitionId))]
    .sort((a, b) => (competitionNames.get(a) ?? a).localeCompare(competitionNames.get(b) ?? b));

  const filteredMatches = useMemo(() => matches
    .filter((match) => !season || (season === unknownSeason ? match.season === null : match.season === season))
    .filter((match) => !team || match.homeTeamId === team || match.awayTeamId === team)
    .filter((match) => !competition || match.competitionId === competition)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), [matches, season, team, competition]);

  const reset = () => {
    setSeason("");
    setTeam("");
    setCompetition("");
  };
  const hasFilters = Boolean(season || team || competition);

  return (
    <>
      <section className="filter-panel" aria-label="Filter matches">
        <label className="filter-field">
          <span>Season</span>
          <select value={season} onChange={(event) => setSeason(event.target.value)} disabled={matches.length === 0}>
            <option value="">All seasons</option>
            {matches.some((match) => match.season === null) && <option value={unknownSeason}>Season not recorded</option>}
            {seasons.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Team</span>
          <select value={team} onChange={(event) => setTeam(event.target.value)} disabled={matches.length === 0}>
            <option value="">All teams</option>
            {teams.map((id) => <option value={id} key={id}>{teamNames.get(id) ?? id}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Competition</span>
          <select value={competition} onChange={(event) => setCompetition(event.target.value)} disabled={matches.length === 0}>
            <option value="">All competitions</option>
            {competitions.map((id) => <option value={id} key={id}>{competitionNames.get(id) ?? id}</option>)}
          </select>
        </label>
        <button type="button" className="reset-button" onClick={reset} disabled={!hasFilters}>Reset</button>
      </section>

      <p className="result-count" role="status" aria-live="polite">
        {filteredMatches.length} {filteredMatches.length === 1 ? "match" : "matches"}
        {hasFilters ? " match your filters" : " in the archive"}
      </p>

      <MatchResultList
        matches={matches}
        filteredMatches={filteredMatches}
        teamNames={teamNames}
        competitionNames={competitionNames}
      />
    </>
  );
}
