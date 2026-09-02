import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const MAX_PAGES = 3;
const START_URL = "https://books.toscrape.com/catalogue/page-1.html";
const CACHE_DIR = "./cache";
const USER_AGENT =
	"FlyRankInternship-A9/1.0 (https://github.com/oreocapybara/polite-scraper)";
const REQUEST_DELAY_MS = 500;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheFileFor(pageUrl) {
	const fileName = path.basename(new URL(pageUrl).pathname);
	return path.join(CACHE_DIR, `catalogue-${fileName}`);
}

// Fetches a catalogue page, using the on-disk cache when available.
// Returns { html, fromCache } so callers only throttle real network hits.
async function getPage(pageUrl) {
	const cacheFile = cacheFileFor(pageUrl);

	if (existsSync(cacheFile)) {
		const html = await readFile(cacheFile, "utf-8");
		console.log(`CACHE HIT - ${pageUrl} - ${html.length} bytes`);
		return { html, fromCache: true };
	}

	const res = await fetch(pageUrl, {
		headers: { "User-Agent": USER_AGENT },
		signal: AbortSignal.timeout(5000),
	});

	if (res.status !== 200) {
		throw new Error(`Fetch failed: status ${res.status}`);
	}

	const html = await res.text();
	await mkdir(CACHE_DIR, { recursive: true });
	await writeFile(cacheFile, html);
	console.log(`FETCH - ${pageUrl} - ${html.length} bytes`);
	return { html, fromCache: false };
}

// Extracts absolute book URLs and the absolute "next page" URL (or null)
// from a catalogue page's HTML.
function extractLinks(html, pageUrl) {
	const $ = cheerio.load(html);

	const bookUrls = $("article.product_pod h3 a")
		.map((_, el) => new URL($(el).attr("href"), pageUrl).toString())
		.get();

	const nextHref = $("li.next a").attr("href");
	const nextUrl = nextHref ? new URL(nextHref, pageUrl).toString() : null;

	return { bookUrls, nextUrl };
}

async function discoverCatalogue() {
	const discovered = [];
	let pageUrl = START_URL;
	let pagesVisited = 0;

	while (pageUrl && pagesVisited < MAX_PAGES) {
		const { html, fromCache } = await getPage(pageUrl);
		pagesVisited += 1;

		const { bookUrls, nextUrl } = extractLinks(html, pageUrl);
		discovered.push(...bookUrls);

		if (!fromCache) {
			await sleep(REQUEST_DELAY_MS);
		}

		pageUrl = nextUrl;
	}

	const uniqueUrls = [...new Set(discovered)];

	console.log(
		`catalogue_pages=${pagesVisited} discovered=${discovered.length} unique_urls=${uniqueUrls.length}`,
	);

	return uniqueUrls;
}

await discoverCatalogue();
