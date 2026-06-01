import { refreshAll } from "../src/lib/sources/index.js";

(async () => {
  console.log("Refreshing all sources...");
  const results = await refreshAll();
  for (const r of results) {
    if (r.ok) {
      console.log(`  ${r.source}: +${r.added} new, ${r.updated} updated`);
    } else {
      console.error(`  ${r.source}: FAILED — ${r.error}`);
    }
  }
  console.log("Done.");
})();
