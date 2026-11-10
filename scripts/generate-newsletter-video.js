const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const admin = require("firebase-admin");
const puppeteer = require("puppeteer");
require("dotenv").config();

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, ".turbo", "newsletter-video");
const args = process.argv.slice(2);
const dateArg = args.find((arg) => arg.startsWith("--date="));
const baseUrlArg = args.find((arg) => arg.startsWith("--base-url="));
const date = dateArg
  ? dateArg.slice("--date=".length)
  : new Date().toISOString().slice(0, 10);
const baseUrl = (
  baseUrlArg
    ? baseUrlArg.slice("--base-url=".length)
    : process.env.NEWSLETTER_VIDEO_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");
const bucketName = "grateful-today-761f2.appspot.com";
const publicGifUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(`public/newsletter/${date}.gif`)}?alt=media&token=${encodeURIComponent(`newsletter-${date}`)}`;

async function renderMp4() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-unsafe-swiftshader",
    ],
  });
  const mp4Path = path.join(outputDir, `newsletter-${date}.mp4`);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 900 });
    await page.goto(`${baseUrl}/email-video?date=${date}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("button")].some(
          (button) => button.textContent.trim() === "Create MP4",
        ),
      { timeout: 90000 },
    );
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent.trim() === "Create MP4")
        ?.click(),
    );
    await page.waitForFunction(
      (fileName) => !!document.querySelector(`a[download="${fileName}"]`),
      { timeout: 240000 },
      `newsletter-${date}.mp4`,
    );
    const base64 = await page.evaluate(async (fileName) => {
      const href = document.querySelector(`a[download="${fileName}"]`).href;
      const blob = await fetch(href).then((response) => response.blob());
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
      });
    }, `newsletter-${date}.mp4`);
    fs.writeFileSync(mp4Path, Buffer.from(base64, "base64"));
  } finally {
    await browser.close();
  }
  return mp4Path;
}

function createGif(mp4Path) {
  const gifPath = path.join(outputDir, `newsletter-${date}.gif`);
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    mp4Path,
    "-vf",
    "fps=8,scale=240:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64:stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
    gifPath,
  ]);
  return gifPath;
}

async function uploadGif(gifPath) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is required to upload the newsletter GIF.",
    );
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  if (serviceAccount.private_key)
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n",
    );
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      storageBucket: bucketName,
    });
  }
  const storagePath = `public/newsletter/${date}.gif`;
  await admin
    .storage()
    .bucket(bucketName)
    .file(storagePath)
    .save(fs.readFileSync(gifPath), {
      contentType: "image/gif",
      resumable: false,
      metadata: {
        metadata: { firebaseStorageDownloadTokens: `newsletter-${date}` },
      },
    });
}

async function main() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("Use --date=YYYY-MM-DD.");
  const mp4Path = await renderMp4();
  const gifPath = createGif(mp4Path);
  const duration = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1",
      gifPath,
    ],
    { encoding: "utf8" },
  ).trim();
  await uploadGif(gifPath);
  console.log(`Uploaded ${publicGifUrl}`);
  console.log(`GIF duration: ${duration}s`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
