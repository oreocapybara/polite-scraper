import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const TARGET_URL = "https://books.toscrape.com/catalogue/page-1.html";
const CACHE_DIR = "./cache";
const CACHE_FILE = path.join(CACHE_DIR, "catalogue-page-1.html");
const USER_AGENT =
	"FlyRankInternship-A9/1.0 (https://github.com/oreocapybara/polite-scraper)";

async function getPage() {
	if (existsSync(CACHE_FILE)) {
		const html = await readFile(CACHE_FILE, "utf-8");
		console.log(`CACHE HIT - ${html.length} bytes`);
		return html;
	}

	const res = await fetch(TARGET_URL, {
		headers: { "User-Agent": USER_AGENT },
		signal: AbortSignal.timeout(5000),
	});

	if (res.status !== 200) {
		throw new Error(`Fetch failed: status ${res.status}`);
	}

	const html = await res.text();
	await mkdir(CACHE_DIR, { recursive: true });
	await writeFile(CACHE_FILE, html);
	console.log(`FETCH - ${html.length} bytes`);
	return html;
}

await getPage();
