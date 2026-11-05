import MatchFilters from "@/components/match-filters";
import { loadArchive } from "@/lib/archive";

export default function MatchesPage() {
  const archive = loadArchive();

  return (
    <main className="page-shell">
      <p className="eyebrow">The match log</p>
      <h1>Every game, in its place.</h1>
      <p className="intro matches-intro">
        Games watched in person, filed by season, team and competition. Pick a match
        to read its matchday notes.
      </p>
      <MatchFilters matches={archive.matches} entities={archive.entities} />
    </main>
  );
}
