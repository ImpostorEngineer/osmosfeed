import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";
import * as htmlparse2 from "htmlparser2";
import path from "path";
import { setCache } from "./lib/cache";
import { getSources } from "./lib/config";
import { render } from "./lib/render";
import { replaceHtmlTags } from "./utils/escape-html-tags";

export interface Article {
  sourceHref: string;
  sourceTitle: string;
  title: string;
  description: string;
  link: string;
  ageInDays: number;
  publishedOn: string;
}

async function run() {
  const sources = getSources();

  const articlesAsyncs: Promise<Article[]>[] = sources.map(async (source) => {
    const response = await axios.get(source.href);
    const xmlString = response.data;
    const feed = htmlparse2.parseFeed(xmlString)!; // TODO error checking

    const items = feed.items ?? [];
    const now = Date.now();

    const article: Article[] = items.map((item) => {
      const { title, link = "", pubDate, description = "" } = item;

      const descriptionParsed = cheerio.load(description);
      const descriptionPlainText = replaceHtmlTags(descriptionParsed.root().text()).trim().slice(0, 1024);

      // TODO enhance result with Mercury parser
      // TODO use cache to prevent refetching

      const enrichedArticle: Article = {
        sourceHref: source.href,
        sourceTitle: feed.title ?? feed.id ?? "",
        title: title ?? "Untitled",
        description: descriptionPlainText,
        link,
        ageInDays: Math.round((now - pubDate!.getTime()) / 1000 / 60 / 60 / 24),
        publishedOn: pubDate!.toISOString(),
      };

      return enrichedArticle;
    });

    return article;
  });

  const articles = (await Promise.all(articlesAsyncs)).flat();
  const recentArticles = articles
    .filter((article) => article.ageInDays < 14)
    .sort((b, a) => a.publishedOn.localeCompare(b.publishedOn));

  setCache({ articles: recentArticles });

  const html = render({ articles: recentArticles });
  fs.mkdirSync(path.resolve("dist"), { recursive: true });
  fs.writeFileSync(path.resolve("dist/index.html"), html);
}

run();
