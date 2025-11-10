import express from "express";
import puppeteer from "puppeteer-core";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteerExtra.use(StealthPlugin()); // dodaj stealth plugin

const app = express();
const PORT = process.env.PORT || 10000;

async function getM3U8(url) {
  const browser = await puppeteerExtra.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: puppeteer.executablePath(),
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({ referer: "https://filemoon.to/" });

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  let m3u8 = null;
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes(".m3u8")) m3u8 = u;
  });

  // čekaj 15 sekundi da se svi requesti učitaju
  await page.waitForTimeout(15000);

  await browser.close();

  if (!m3u8) throw new Error("m3u8 not found");
  return m3u8;
}

app.get("/get", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing ?url param" });
  try {
    const link = await getM3U8(url);
    res.json({ m3u8: link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Filemoon extractor running on port ${PORT}`));
