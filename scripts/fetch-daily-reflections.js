const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const SOURCE_URL = "https://www.aa.org/daily-reflections";
const ARCHIVE_URL = "https://www.aa.org/taxonomy/term/76";
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../content/daily-reflections.json",
);
const REQUEST_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 3;
const MAX_PAGES = 100;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function text($, element) {
  const clone = $(element).clone();
  clone.find("br").replaceWith(" ");
  return normalizeWhitespace(clone.text());
}

function paragraphs($, selector) {
  return $(selector)
    .find("p")
    .map((index, element) => text($, element))
    .get()
    .filter(Boolean);
}

async function fetchHtml(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          "user-agent":
            "gratefultoday-daily-reflections/1.0 (+https://gratefultoday.com)",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error(
          `${url}: AA returned ${response.status} ${response.statusText}`,
        );
        error.retryable = [408, 429, 500, 502, 503, 504].includes(
          response.status,
        );
        throw error;
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      const retryable =
        error.retryable ||
        error.name === "AbortError" ||
        error instanceof TypeError;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await delay(attempt * 2000);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

function parseArticle($, article, pageUrl) {
  const date = $(article).attr("data-date");
  const title = text($, $(article).find(".field--name-title").first());
  const teaser = paragraphs(
    $,
    $(article).find(".field--name-field-teaser").first(),
  );
  const body = paragraphs($, $(article).find(".field--name-body").first());

  if (!date || !/^\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${pageUrl}: reflection has an invalid data-date value`);
  }
  if (teaser.length < 2) {
    throw new Error(
      `${pageUrl}: ${date} does not contain a quotation and citation`,
    );
  }
  if (!teaser.every((paragraph, index) => body[index] === paragraph)) {
    throw new Error(`${pageUrl}: ${date} body does not start with its teaser`);
  }

  return {
    date,
    title,
    quote: teaser.slice(0, -1).join("\n\n"),
    citation: teaser[teaser.length - 1],
    reflection: body.slice(teaser.length),
  };
}

function parsePage(html, pageUrl) {
  const $ = cheerio.load(html);
  const articles = $(".view-content article.node--type-daily-reflection");
  if (!articles.length)
    throw new Error(`${pageUrl}: no daily reflections found`);

  const reflections = articles
    .map((index, article) => parseArticle($, article, pageUrl))
    .get();
  const nextHref = $(".pager__item--next a").first().attr("href");
  const nextUrl = nextHref ? new URL(nextHref, pageUrl).toString() : null;
  const copyright = text($, $(".view-header .field--name-description").first());

  return { reflections, nextUrl, copyright };
}

function expectedDates() {
  return Array.from({ length: 366 }, (value, index) => {
    const date = new Date(Date.UTC(2024, 0, index + 1));
    return date.toISOString().slice(5, 10);
  });
}

function validateReflections(reflections) {
  const dates = reflections.map((reflection) => reflection.date);
  const uniqueDates = new Set(dates);

  if (reflections.length !== 366 || uniqueDates.size !== 366) {
    throw new Error(
      `Expected 366 unique reflections; received ${reflections.length} entries and ${uniqueDates.size} dates`,
    );
  }

  const expected = expectedDates();
  const missing = expected.filter((date) => !uniqueDates.has(date));
  const unexpected = [...uniqueDates].filter(
    (date) => !expected.includes(date),
  );
  if (missing.length || unexpected.length) {
    throw new Error(
      `Date coverage mismatch. Missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}`,
    );
  }

  for (const reflection of reflections) {
    if (
      !reflection.title ||
      !reflection.quote ||
      !reflection.citation ||
      !reflection.reflection.length ||
      reflection.reflection.some((paragraph) => !paragraph)
    ) {
      throw new Error(
        `${reflection.date}: one or more required fields are empty`,
      );
    }
  }

  const order = new Map(expected.map((date, index) => [date, index]));
  reflections.sort(
    (left, right) => order.get(left.date) - order.get(right.date),
  );
}

async function main() {
  const reflections = [];
  const visited = new Set();
  let pageUrl = ARCHIVE_URL;
  let copyright = "";

  while (pageUrl) {
    if (visited.has(pageUrl))
      throw new Error(`Pagination loop detected at ${pageUrl}`);
    if (visited.size >= MAX_PAGES)
      throw new Error(`Refusing to fetch more than ${MAX_PAGES} archive pages`);
    visited.add(pageUrl);

    const html = await fetchHtml(pageUrl);
    const page = parsePage(html, pageUrl);
    reflections.push(...page.reflections);
    copyright ||= page.copyright;
    console.log(
      `Fetched ${page.reflections.length} reflections from ${pageUrl}`,
    );

    pageUrl = page.nextUrl;
    if (pageUrl) await delay(REQUEST_DELAY_MS);
  }

  validateReflections(reflections);
  if (!copyright) throw new Error("Archive copyright metadata is empty");

  const output = {
    source: SOURCE_URL,
    copyright,
    reflections,
  };
  const temporaryPath = `${OUTPUT_PATH}.tmp`;
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    temporaryPath,
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );
  fs.renameSync(temporaryPath, OUTPUT_PATH);
  console.log(
    `Saved ${reflections.length} reflections to ${path.relative(process.cwd(), OUTPUT_PATH)}`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
