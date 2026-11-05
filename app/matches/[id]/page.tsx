import Link from "next/link";
import { notFound } from "next/navigation";
import { loadArchive, type Match } from "@/lib/archive";

const emptyArchiveRoute = "__empty_archive__";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

type MatchPageProps = Readonly<{ params: Promise<Readonly<{ id: string }>> }>;
type EntityNames = ReadonlyMap<string, string>;

function PlayersPanel({ match, playerNames }: Readonly<{ match: Match; playerNames: EntityNames }>) {
  if (match.appearances.coverage === "unknown") {
    return <p>Appearance information is not available for this match.</p>;
  }
  if (match.appearances.playerIds.length === 0) {
    return <p>No player appearances are recorded.</p>;
  }

  const coverageNote = match.appearances.coverage === "complete"
    ? "Complete recorded appearance list: starters and substitutes who entered the pitch."
    : "Partial list of confirmed appearances. Missing names do not mean those players did not play.";

  return (
    <>
      <ul>
        {match.appearances.playerIds.map((playerId) => <li key={playerId}>{playerNames.get(playerId) ?? playerId}</li>)}
      </ul>
      <p className="coverage-note">{coverageNote}</p>
      <p className="coverage-note">Appearance evidence: {match.appearances.evidence}</p>
    </>
  );
}

function EventsPanel({
  match,
  playerNames,
  teamNames,
}: Readonly<{ match: Match; playerNames: EntityNames; teamNames: EntityNames }>) {
  if (!match.events) {
    return <p>Events have not been recorded.</p>;
  }
  if (match.events.items.length === 0) {
    return <p>No events are recorded. {match.events.coverage === "partial" && "The event record is partial."}</p>;
  }

  return (
    <>
      <ul>
        {match.events.items.map((event, index) => (
          <li key={`${event.minute}-${event.type}-${index}`}>
            {event.minute === null ? "Time not recorded" : `${event.minute}′`} · {event.description ?? event.type}
            {event.playerId ? ` — ${playerNames.get(event.playerId) ?? event.playerId}` : ""}
            {event.teamId ? ` (${teamNames.get(event.teamId) ?? event.teamId})` : ""}
          </li>
        ))}
      </ul>
      <p className="coverage-note">{match.events.coverage === "complete" ? "Complete recorded event list." : "Partial event record."}</p>
    </>
  );
}

function StatisticsPanel({ match }: Readonly<{ match: Match }>) {
  if (!match.statistics) {
    return <p>Match statistics are not available.</p>;
  }
  if (match.statistics.items.length === 0) {
    return <p>No statistics are recorded. {match.statistics.coverage === "partial" && "The statistics record is partial."}</p>;
  }

  const coverageNote = match.statistics.coverage === "complete"
    ? "Complete recorded statistics."
    : "Partial statistics; blank values are unknown.";

  return (
    <>
      <dl className="key-value">
        {match.statistics.items.map((item) => (
          <div className="statistic-row" key={item.name}>
            <dt>{item.name}</dt>
            <dd>{item.home ?? "Unknown"} – {item.away ?? "Unknown"}</dd>
          </div>
        ))}
      </dl>
      <p className="coverage-note">{coverageNote}</p>
    </>
  );
}

export function generateStaticParams() {
  const matches = loadArchive().matches;
  return matches.length ? matches.map((match) => ({ id: match.id })) : [{ id: emptyArchiveRoute }];
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  if (id === emptyArchiveRoute) notFound();
  const { entities, matches } = loadArchive();
  const match = matches.find((record) => record.id === id);
  if (!match) notFound();

  const teamNames = new Map(entities.teams.map((team) => [team.id, team.name]));
  const playerNames = new Map(entities.players.map((player) => [player.id, player.name]));
  const competitionNames = new Map(entities.competitions.map((item) => [item.id, item.name]));
  const venueNames = new Map(entities.venues.map((venue) => [venue.id, venue.name]));
  const isCompleted = match.status === "completed" && match.score !== null;
  const home = teamNames.get(match.homeTeamId) ?? match.homeTeamId;
  const away = teamNames.get(match.awayTeamId) ?? match.awayTeamId;
  const venue = match.venueId === null
    ? "Not recorded"
    : venueNames.get(match.venueId) ?? match.venueId;
  const recordedScore = match.score ? `${match.score.home} – ${match.score.away}` : "—";
  let scoreboardLabel = "Match score not recorded";
  if (match.score !== null) {
    scoreboardLabel = "Recorded score, excluding shootout kicks";
  }
  if (isCompleted) {
    scoreboardLabel = "Final score, excluding shootout kicks";
  }

  return (
    <main className="page-shell">
      <Link className="back-link" href="/matches/">← All matches</Link>
      <div className="detail-head">
        <p className="eyebrow">{competitionNames.get(match.competitionId) ?? match.competitionId}</p>
        <h1>{home} <span aria-hidden="true">v</span> {away}</h1>
        <p className="intro">
          {formatDate(match.date)}{match.season ? ` · ${match.season}` : " · Season not recorded"}
          {!isCompleted && <> · <span className="status-pill">{match.status}</span></>}
        </p>
      </div>

      <section className="detail-scoreboard" aria-label={scoreboardLabel}>
        <span className="detail-team">{home}</span>
        <span className="detail-score">{recordedScore}</span>
        <span className="detail-team">{away}</span>
      </section>
      {isCompleted && match.extraTimePlayed === true && (
        <p className="coverage-note">The recorded final score includes extra time. Penalty shootout kicks are not included in match goals.</p>
      )}

      <div className="detail-panels">
        <section className="detail-panel">
          <h2>Match details</h2>
          <dl className="key-value">
            <dt>Competition</dt><dd>{competitionNames.get(match.competitionId) ?? match.competitionId}</dd>
            <dt>Venue</dt><dd>{venue}</dd>
            <dt>Season</dt><dd>{match.season ?? "Not recorded"}</dd>
            {match.shootout && <><dt>Penalty shootout</dt><dd>{match.shootout.home} – {match.shootout.away}</dd></>}
          </dl>
        </section>

        <section className="detail-panel">
          <h2>Players who appeared</h2>
          <PlayersPanel match={match} playerNames={playerNames} />
        </section>

        <section className="detail-panel">
          <h2>Match events</h2>
          <EventsPanel match={match} playerNames={playerNames} teamNames={teamNames} />
        </section>

        <section className="detail-panel">
          <h2>Statistics</h2>
          <StatisticsPanel match={match} />
        </section>
      </div>
    </main>
  );
}
