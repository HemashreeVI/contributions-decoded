const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SHOTS = process.argv[2];

function calendar() {
  // 53 weeks ending today; GitHub renders one <td> per day plus a sr-only <tool-tip>
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - 52 * 7 - today.getUTCDay());
  const rows = Array.from({ length: 7 }, () => []), tips = [];
  let total = 0, seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let d = new Date(start), i = 0; d <= today; d.setUTCDate(d.getUTCDate() + 1), i++) {
    const age = (today - d) / 864e5;
    let c = age < 70 ? (rnd() < .92 ? Math.floor(rnd() * 14) + 1 : 0) : (rnd() < .35 ? Math.floor(rnd() * 5) + 1 : 0);
    if (age < 9) c = Math.max(c, 2);            // a current streak
    total += c;
    const id = `contribution-day-component-${d.getUTCDay()}-${i}`, date = d.toISOString().slice(0, 10);
    const level = c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 10 ? 3 : 4;
    rows[d.getUTCDay()].push(`<td tabindex="0" data-date="${date}" id="${id}" data-level="${level}" class="ContributionCalendar-day"></td>`);
    tips.push(`<tool-tip for="${id}" class="sr-only">${c ? `${c} contribution${c > 1 ? 's' : ''}` : 'No contributions'} on ${date}.</tool-tip>`);
  }
  return { total, html: `<div class="js-yearly-contributions"><h2 class="f4 text-normal mb-2">${total.toLocaleString('en-US')} contributions in the last year</h2>
    <table class="ContributionCalendar-grid"><tbody>${rows.map(r => `<tr>${r.join('')}</tr>`).join('')}</tbody></table>${tips.join('')}</div>` };
}

const cal = calendar();
const PROFILE = `<!doctype html><html><head><meta charset="utf-8"><title>HemashreeVI (Hemashree)</title>
<style>body{background:#0d1117;color:#e6edf3;font:14px -apple-system,Segoe UI,sans-serif;margin:0}main{max-width:820px;margin:0 auto;padding:24px}
.ContributionCalendar-day{width:10px;height:10px;border-radius:2px;background:#161b22}.ContributionCalendar-day[data-level="1"]{background:#0e4429}
.ContributionCalendar-day[data-level="2"]{background:#006d32}.ContributionCalendar-day[data-level="3"]{background:#26a641}.ContributionCalendar-day[data-level="4"]{background:#39d353}
table{border-spacing:3px}.sr-only{display:none}.TimelineItem{border-left:2px solid #30363d;padding:8px 0 8px 18px;margin-left:10px}
.Box{border:1px solid #30363d;border-radius:6px;padding:12px;margin-top:8px}.color-fg-success{color:#3fb950}.color-fg-danger{color:#f85149}
.diffstat-block-added{display:inline-block;width:8px;height:8px;background:#3fb950;margin-left:1px}.State--merged{background:#8957e5;border-radius:10px;padding:0 6px;font-size:12px}
a{color:#e6edf3}</style></head><body><main>
${cal.html}
<div id="js-contribution-activity"><h2>Contribution activity</h2><div class="contribution-activity-listing">
 <div class="TimelineItem"><div class="TimelineItem-body"><details><summary><span class="color-fg-default ws-normal text-left">Created 98 commits in 9 repositories</span></summary></details></div></div>
 <div class="TimelineItem"><div class="TimelineItem-body"><details><summary><span class="color-fg-default ws-normal text-left">Created 15 repositories</span></summary></details></div></div>
 <div class="TimelineItem"><div class="TimelineItem-body"><h4 class="text-normal">Created a pull request in <a href="/HemashreeVI/Nova">HemashreeVI/Nova</a> that received 1 comment</h4>
   <div class="Box"><h3><a href="#">Claude/zen feynman 2s1vtb</a></h3>
   <div class="f6"><span class="d-inline-block"><span class="color-fg-success">+5,310</span> <span class="color-fg-danger">−0</span> <span class="diffstat-block-added"></span><span class="diffstat-block-added"></span><span class="diffstat-block-added"></span><span class="diffstat-block-added"></span><span class="diffstat-block-added"></span> lines changed</span> • 1 comment</div></div></div></div>
 <div class="TimelineItem"><div class="TimelineItem-body"><details open><summary><span class="color-fg-default ws-normal text-left">Opened 23 other pull requests in 4 repositories</span></summary>
   <ul><li><a>HemashreeVI/SeatLock</a> <span class="State--merged">8 merged</span></li><li><a>HemashreeVI/HemashreeVI</a> <span class="State--merged">7 merged</span></li>
   <li><a>HemashreeVI/KanchiLoom</a> <span class="State--merged">5 merged</span></li><li><a>HemashreeVI/Nova</a> <span class="State--merged">3 merged</span></li></ul></details></div></div>
 <div class="TimelineItem"><div class="TimelineItem-body"><h4 class="text-normal">Created an issue in <a href="/HemashreeVI/HemashreeVI">HemashreeVI/HemashreeVI</a> that received 1 comment</h4>
   <div class="Box"><h3>chess|move|e2e4</h3></div></div></div>
</div></div></main></body></html>`;

(async () => {
  const ext = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: { width: 1280, height: 1000 },
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
  await ctx.route('https://github.com/**', r => r.fulfill({ contentType: 'text/html', body: PROFILE }));
  const errors = [];
  const p = await ctx.newPage(); p.on('console', c => c.type() === 'error' && errors.push(c.text())); p.on('pageerror', e => errors.push(e.message));
  await p.goto('https://github.com/HemashreeVI'); await p.waitForTimeout(1500);
  const notes = await p.$$eval('.cd-note', ns => ns.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  console.log('notes added:', notes.length); notes.forEach(x => console.log(' •', x));
  await p.locator('#js-contribution-activity').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${SHOTS}/cd-notes.png`, clip: { x: 220, y: 0, width: 840, height: 1000 }, fullPage: true });
  await p.locator('#contrib-decoded-host >> css=.tab').click(); await p.waitForTimeout(500);
  const panel = await p.evaluate(() => document.querySelector('#contrib-decoded-host').shadowRoot.querySelector('.body').innerText.split('\n').slice(0, 14).join(' | '));
  console.log('panel:', panel, '\nexpected total:', cal.total);
  await p.screenshot({ path: `${SHOTS}/cd-panel.png` });
  // toggle notes off
  await p.evaluate(() => document.querySelector('#contrib-decoded-host').shadowRoot.querySelector('.sw input').click());
  console.log('notes visible after switching off:', await p.$$eval('.cd-note', ns => ns.filter(x => x.style.display !== 'none').length));
  // a repo page shouldn't get the panel
  await p.goto('https://github.com/HemashreeVI/SeatLock'); await p.waitForTimeout(1200);
  console.log('panel on a repo page:', await p.evaluate(() => { const h = document.querySelector('#contrib-decoded-host'); return h && h.style.display !== 'none' ? 'shown (wrong)' : 'hidden ✓'; }));
  console.log('errors:', errors.length ? errors : 'none');
  await ctx.close();
})();
