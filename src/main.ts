import fs from "fs";
import path from "path";
import { copyAssets } from "./lib/assets";
import { getCache, setCache } from "./lib/cache";
import { getSources } from "./lib/config";
import { enrich, EnrichedSource } from "./lib/enrich";
import { render } from "./lib/render";

async function run() {
  const sources = getSources();

  const cache = getCache();

  const enrichedSources: EnrichedSource[] = await Promise.all(sources.map((source) => enrich(source, cache)));
  setCache({ sources: enrichedSources });

  const articles = enrichedSources.map((enrichedSource) => enrichedSource.articles).flat();

  const html = render({ articles });
  fs.mkdirSync(path.resolve("public"), { recursive: true });
  fs.writeFileSync(path.resolve("public/index.html"), html);

  await copyAssets();
}

run();
