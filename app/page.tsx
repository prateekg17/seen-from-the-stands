import Link from "next/link";
import { loadArchive, summarizeArchive } from "@/lib/archive";

export default function Home() {
  const { entities, matches } = loadArchive();
  const summary = summarizeArchive(matches);
  const teamNames = new Map(entities.teams.map((team) => [team.id, team.name]));
  const playerNames = new Map(entities.players.map((player) => [player.id, player.name]));
  const matchById = new Map(matches.map((match) => [match.id, match]));

  return (
    <main className="page-shell">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">A personal football archive · 2009 onwards</p>
          <h1>The matches I was there for.</h1>
          <p className="intro">
            A growing record of football watched from the stands: the grounds,
            the scorelines and the players who made the day.
          </p>
          <Link className="hero-link" href="/matches/">Turn to the match log <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="pitch-mark" aria-hidden="true">
          <span className="pitch-label">MATCHDAY<br />NOTES</span>
          <span className="pitch-stamp" />
          <span className="pitch-date">SINCE<br />2009</span>
        </div>
      </section>

      <div className="section-heading archive-heading">
        <div>
          <p className="eyebrow">In the book so far</p>
          <h2>The running totals</h2>
        </div>
        <p>A running count of the matches and moments that made it into the book.</p>
      </div>

      <section className="stat-grid" aria-label="Archive totals">
        <article className="stat-card">
          <span className="stat-value">{summary.matchCount}</span>
          <span className="stat-label">Matches</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{summary.goals}</span>
          <span className="stat-label">Goals recorded</span>
          <span className="stat-detail">{summary.completedMatchCount} completed scorelines</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{summary.teamCount}</span>
          <span className="stat-label">Teams</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{summary.venueCount}</span>
          <span className="stat-label">Grounds</span>
          <span className="stat-detail">Known venues only</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{summary.competitionCount}</span>
          <span className="stat-label">Competitions</span>
        </article>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">From the ledger</p>
          <h2>Favourites &amp; firsts</h2>
        </div>
        <p>Only players confirmed to have taken the pitch count here.</p>
      </div>

      <section className="record-grid" aria-label="Archive records">
        <article className="record-card">
          <span className="record-index">01 / MOST VISITED</span>
          <h3>Teams I keep coming back to</h3>
          {summary.mostWatchedTeams.length ? (
            <ul className="record-list">
              {summary.mostWatchedTeams.map(({ id, count }) => (
                <li key={id}><span>{teamNames.get(id) ?? id}</span><strong>{count} matches</strong></li>
              ))}
            </ul>
          ) : <p>The first fixture is still to come.</p>}
        </article>
        <article className="record-card">
          <span className="record-index">02 / MOST SEEN</span>
          <h3>Players seen most often</h3>
          {summary.mostSeenPlayers.length ? (
            <>
              <ul className="record-list">
                {summary.mostSeenPlayers.map(({ id, count }) => (
                  <li key={id}><span>{playerNames.get(id) ?? id}</span><strong>{count} matches</strong></li>
                ))}
              </ul>
              <p className="coverage-note">
                Confirmed appearances in {summary.appearanceEvidenceCount} of {summary.matchCount} archived matches.
                {summary.appearanceEvidenceCount < summary.matchCount ? " Incomplete coverage; not an all-time ranking." : ""}
              </p>
            </>
          ) : <p>Player appearances will show here when they are sourced.</p>}
        </article>
        <article className="record-card">
          <span className="record-index">03 / BIGGEST SCORES</span>
          <h3>Goal-fests</h3>
          {summary.highestScoringMatches.length ? (
            <ul className="record-list">
              {summary.highestScoringMatches.map(({ id, goals }) => {
                const match = matchById.get(id);
                if (!match) return null;
                return (
                  <li key={id}>
                    <Link href={`/matches/${id}/`}>
                      {teamNames.get(match.homeTeamId) ?? match.homeTeamId} {match.score!.home}–{match.score!.away} {teamNames.get(match.awayTeamId) ?? match.awayTeamId}
                    </Link>
                    <strong>{goals} goals</strong>
                  </li>
                );
              })}
            </ul>
          ) : <p>No completed scorelines in the book yet.</p>}
        </article>
      </section>

      <p className="coverage-note">
        Appearance notes for {summary.appearanceEvidenceCount} of {summary.matchCount} matches.
        The player list is incomplete wherever an appearance is still unknown.
      </p>
      <p className="archive-disclaimer">Still a work in progress—not yet a complete record of every match attended since 2009.</p>
      {matches.length === 0 && (
        <section className="empty-state archive-empty" aria-labelledby="archive-empty-heading">
          <span className="record-index">THE FIRST ENTRY</span>
          <h2 id="archive-empty-heading">The first match is still to come.</h2>
          <p>
            No matches logged yet. When they arrive, they’ll be games watched from the stands—not guessed results.
          </p>
          <p className="archive-empty-link"><Link href="/matches/">Have a look at the empty match log <span aria-hidden="true">→</span></Link></p>
        </section>
      )}
    </main>
  );
}
