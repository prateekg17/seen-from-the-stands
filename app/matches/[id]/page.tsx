import Link from "next/link";
import { notFound } from "next/navigation";
import { loadArchive } from "@/lib/archive";

const emptyArchiveRoute = "__empty_archive__";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function generateStaticParams() {
  const matches = loadArchive().matches;
  return matches.length ? matches.map((match) => ({ id: match.id })) : [{ id: emptyArchiveRoute }];
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
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

      <section className="detail-scoreboard" aria-label={isCompleted ? "Final score, excluding shootout kicks" : "Match score not recorded"}>
        <span className="detail-team">{home}</span>
        <span className="detail-score">{isCompleted ? `${match.score!.home} – ${match.score!.away}` : "—"}</span>
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
            <dt>Venue</dt><dd>{match.venueId ? venueNames.get(match.venueId) ?? match.venueId : "Not recorded"}</dd>
            <dt>Season</dt><dd>{match.season ?? "Not recorded"}</dd>
            {match.shootout && <><dt>Penalty shootout</dt><dd>{match.shootout.home} – {match.shootout.away}</dd></>}
          </dl>
        </section>

        <section className="detail-panel">
          <h2>Players who appeared</h2>
          {match.appearances.coverage === "unknown" ? (
            <p>Appearance information is not available for this match.</p>
          ) : match.appearances.playerIds.length ? (
            <>
              <ul>
                {match.appearances.playerIds.map((playerId) => <li key={playerId}>{playerNames.get(playerId) ?? playerId}</li>)}
              </ul>
              <p className="coverage-note">
                {match.appearances.coverage === "complete"
                  ? "Complete recorded appearance list: starters and substitutes who entered the pitch."
                  : "Partial list of confirmed appearances. Missing names do not mean those players did not play."}
              </p>
              <p className="coverage-note">Appearance evidence: {match.appearances.evidence}</p>
            </>
          ) : <p>No player appearances are recorded.</p>}
        </section>

        <section className="detail-panel">
          <h2>Match events</h2>
          {!match.events ? <p>Events have not been recorded.</p> : match.events.items.length ? (
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
          ) : <p>No events are recorded. {match.events.coverage === "partial" && "The event record is partial."}</p>}
        </section>

        <section className="detail-panel">
          <h2>Statistics</h2>
          {!match.statistics ? <p>Match statistics are not available.</p> : match.statistics.items.length ? (
            <>
              <dl className="key-value">
                {match.statistics.items.map((item) => (
                  <div className="statistic-row" key={item.name}>
                    <dt>{item.name}</dt>
                    <dd>{item.home ?? "Unknown"} – {item.away ?? "Unknown"}</dd>
                  </div>
                ))}
              </dl>
              <p className="coverage-note">{match.statistics.coverage === "complete" ? "Complete recorded statistics." : "Partial statistics; blank values are unknown."}</p>
            </>
          ) : <p>No statistics are recorded. {match.statistics.coverage === "partial" && "The statistics record is partial."}</p>}
        </section>
      </div>
    </main>
  );
}
