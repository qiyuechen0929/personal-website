import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader"] });

async function seed() {
  const r = await fetch("https://chenqiyue.ccwu.cc/api/notes", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:"这间屋子比简历好看多了",name:"凌晨的路人"})});
  return r.json();
}
await seed();
await new Promise(r=>setTimeout(r,21000));
await seed();

const ctx = await b.newContext({ viewport: { width: 1280, height: 820 } });
const p = await ctx.newPage();
await p.goto("https://chenqiyue.ccwu.cc/", { waitUntil: "load", timeout: 45000 });
await p.waitForTimeout(1200);
await p.evaluate(() => document.getElementById("enter")?.click());
await p.waitForTimeout(1200);
await p.evaluate(() => document.getElementById("open-space")?.click());
await p.waitForTimeout(5000);
await p.evaluate(() => { const h=window.__room.interact.find(x=>x.id==="notes"); h.action(h); });
await p.waitForTimeout(3800);
await p.fill("#note-text", "第一次进来转了半小时");
await p.fill("#note-name", "阿柯");
await p.click("#note-send");
await p.waitForTimeout(1600);
await p.screenshot({ path: "final-notes.png" });
await p.evaluate(() => document.getElementById("panel-close").click());
await p.waitForTimeout(900);
await p.evaluate(() => { const h=window.__room.interact.find(x=>x.id==="drawer"); h.action(h); });
await p.waitForTimeout(3200);
await p.screenshot({ path: "final-drawer.png" });

const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const q = await m.newPage();
await q.goto("https://chenqiyue.ccwu.cc/", { waitUntil: "load", timeout: 45000 });
await q.waitForTimeout(1400);
await q.evaluate(() => document.getElementById("enter")?.click());
await q.waitForTimeout(1400);
await q.evaluate(() => document.getElementById("open-space")?.click());
await q.waitForTimeout(5200);
await q.evaluate(() => { const h=window.__room.interact.find(x=>x.id==="notes"); h.action(h); });
await q.waitForTimeout(4200);
await q.screenshot({ path: "final-mob.png" });
console.log("shots done");
await b.close();
