import fs from "fs";
import { performance } from "perf_hooks";
import path from "path";
import { copyAssets } from "./lib/assets";
import { getCache, setCache } from "./lib/cache";
import { getConfig } from "./lib/config";
import { enrich, EnrichedSource } from "./lib/enrich";
import { render } from "./lib/render";
import { cliVersion } from "./utils/version";

async function run() {
  const startTime = performance.now();
  console.log(`[main] Starting build using cli version ${cliVersion}`);

  const { sources, cacheUrl } = getConfig();

  const cache = await getCache(cacheUrl);

  const enrichedSources: EnrichedSource[] = await Promise.all(sources.map((source) => enrich(source, cache)));
  setCache({ sources: enrichedSources, cliVersion });

  const articles = enrichedSources
    .map((enrichedSource) => enrichedSource.articles)
    .flat()
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));

  const html = render({ articles });
  fs.mkdirSync(path.resolve("public"), { recursive: true });
  fs.writeFileSync(path.resolve("public/index.html"), html);

  await copyAssets();

  const durationInSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`[main] Finished build in ${durationInSeconds} seconds`);
}

run();
