import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await p.goto("file:///D:/%E4%B8%AA%E4%BA%BA%E7%BD%91%E7%AB%99/vendor/media/_first.html", { waitUntil: "load" });
await p.waitForTimeout(1500);
await p.screenshot({ path: "reel/first.png" });
await b.close();
