import { loadArchive } from "../lib/archive";

const archive = loadArchive();
console.log(`Validated ${archive.matches.length} match records and ${Object.values(archive.entities).reduce((total, items) => total + items.length, 0)} shared entities.`);
