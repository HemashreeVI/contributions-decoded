// Contributions Decoded: plain-English notes on GitHub profile pages, plus a summary panel.
// Reads only what's already on the page (no API calls), so it works on any public profile.
(() => {
  const n = s => Number(String(s).replace(/[^\d]/g, '')) || 0;
  const fmt = x => x.toLocaleString('en-US');
  const plural = (x, one, many = one + 's') => `${fmt(x)} ${x === 1 ? one : many}`;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let notesOn = true;

  // ---------------------------------------------------------------- plain-English rules for activity lines
  // Each rule: a pattern for the text GitHub shows, and what it means.
  const RULES = [
    [/^Created ([\d,]+) commits? in ([\d,]+) repositor/i, (m, el) => {
      const c = n(m[1]), r = n(m[2]);
      return `A <b>commit</b> is one saved change (like hitting "save" with a note). This month they saved ${plural(c, 'change')} across ${plural(r, 'project')}` +
        (c / Math.max(r, 1) >= 10 ? `, about ${Math.round(c / r)} per project.` : '.');
    }],
    [/^Created ([\d,]+) repositor/i, m => `A <b>repository</b> (repo) is a project folder on GitHub. They started ${plural(n(m[1]), 'new project')} this month.`],
    [/^Created a pull request in (\S+) that received ([\d,]+) comments?/i, m =>
      `A <b>pull request</b> (PR) asks to add changes into a project's main code, so others can review them first. This PR in ${esc(m[1])} got ${plural(n(m[2]), 'comment')} from reviewers.`],
    [/^Opened ([\d,]+) (other )?pull requests? in ([\d,]+) repositor/i, (m, el) => {
      const item = el.closest('.TimelineItem, li, div') || el;
      const merged = [...(item.closest('.TimelineItem') || item).querySelectorAll('*')].map(x => x.childElementCount === 0 && (x.textContent.match(/^\s*([\d,]+)\s+merged\s*$/i) || [])[1]).filter(Boolean).reduce((a, b) => a + n(b), 0);
      const total = n(m[1]);
      return `They proposed ${plural(total, 'change request')} (pull requests) in ${plural(n(m[3]), 'project')}.` +
        (merged ? ` <b>${fmt(merged)} merged</b> means ${merged === total ? 'all of them were' : `${fmt(merged)} of ${fmt(total)} were`} accepted into the project's main code.` : '');
    }],
    [/^Opened ([\d,]+) (other )?issues? in ([\d,]+) repositor/i, m =>
      `An <b>issue</b> is a to-do or bug report. They opened ${plural(n(m[1]), 'issue')} in ${plural(n(m[3]), 'project')}.`],
    [/^Created an issue in (\S+) that received ([\d,]+) comments?/i, m =>
      `An <b>issue</b> is a to-do, question or bug report. This one in ${esc(m[1])} got ${plural(n(m[2]), 'reply', 'replies')}.`],
    [/^Reviewed ([\d,]+) pull requests? in ([\d,]+) repositor/i, m =>
      `A <b>review</b> is reading someone else's proposed changes and approving them or asking for fixes. They reviewed ${plural(n(m[1]), 'request')} in ${plural(n(m[2]), 'project')}.`],
    [/^Opened their first pull request/i, () => `Their very first pull request on GitHub: a milestone.`],
    [/^Joined GitHub/i, () => `The day this account was created.`],
    [/^Created ([\d,]+) commits? in (\S+)$/i, m => `${plural(n(m[1]), 'saved change')} (commits) in ${esc(m[2])}.`],
  ];
  const DIFF = /^\+\s?([\d,]+)\s*[−–-]\s?([\d,]+)/;

  function note(html, cls = '') {
    const d = document.createElement('div');
    d.className = 'cd-note ' + cls;
    d.innerHTML = `<span class="cd-i">i</span><span>${html}</span>`;
    Object.assign(d.style, { display: notesOn ? 'flex' : 'none', gap: '8px', alignItems: 'flex-start', margin: '6px 0 8px', padding: '7px 10px',
      borderRadius: '8px', background: 'rgba(124,92,255,.12)', border: '1px solid rgba(124,92,255,.35)', color: 'var(--fgColor-default, #e6edf3)',
      font: '12.5px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif', whiteSpace: 'normal', textAlign: 'left' });
    const i = d.firstChild;
    Object.assign(i.style, { flex: 'none', width: '16px', height: '16px', borderRadius: '50%', background: '#7C5CFF', color: '#fff',
      font: '700 11px/16px Georgia,serif', textAlign: 'center', marginTop: '2px' });
    return d;
  }

  // deepest elements whose own text matches: they're the visible line, not a big container
  function deepest(root, test) {
    const out = [];
    for (const el of root.querySelectorAll('span, a, summary, h3, h4, div, p, button')) {
      if (el.closest('.cd-note')) continue;
      const t = el.textContent.replace(/\s+/g, ' ').trim();
      if (t.length > 300 || !test(t)) continue;
      if ([...el.children].some(c => test(c.textContent.replace(/\s+/g, ' ').trim()))) continue;
      out.push([el, t]);
    }
    return out;
  }

  function annotateActivity() {
    const root = document.querySelector('.contribution-activity-listing, #js-contribution-activity') ||
      [...document.querySelectorAll('h2')].find(h => /contribution activity/i.test(h.textContent))?.parentElement;
    if (!root) return 0;
    let added = 0;
    for (const [el, t] of deepest(root, t => RULES.some(([re]) => re.test(t)))) {
      if (el.dataset.cdDone) continue;
      const [re, fn] = RULES.find(([r]) => r.test(t));
      // a <summary> sits inside <details>, which hides everything else while collapsed: put the note after the <details>
      const block = el.closest('summary')?.parentElement || el.closest('h3, h4, .TimelineItem-body > *') || el;
      block.insertAdjacentElement('afterend', note(fn(t.match(re), el)));
      el.dataset.cdDone = 1; added++;
    }
    for (const [el, t] of deepest(root, t => DIFF.test(t) && t.length < 140)) {
      if (el.dataset.cdDone) continue;
      const [, a, d] = t.match(DIFF), A = n(a), D = n(d);
      const what = A + D === 0 ? '' : D === 0 ? 'only added new code, nothing was deleted' : A === 0 ? 'only deleted code' : A > D * 3 ? 'mostly added code' : D > A * 3 ? 'mostly removed code' : 'both added and removed code';
      const big = A + D > 3000 ? ' Very large numbers usually mean whole new files, copied libraries or auto-generated files, not lines typed by hand.' : '';
      el.insertAdjacentElement('afterend', note(`<b>+${fmt(A)}</b> = lines added, <b>−${fmt(D)}</b> = lines removed. The 5 little squares are a quick picture of that balance` +
        ` (${what}; green or blue = added, red or orange = removed, grey = small share).${big}`, 'cd-diff'));
      el.dataset.cdDone = 1; added++;
    }
    return added;
  }

  // ---------------------------------------------------------------- the calendar
  function readCalendar() {
    const cells = [...document.querySelectorAll('td.ContributionCalendar-day[data-date], rect.ContributionCalendar-day[data-date], [data-date][data-level]')];
    if (!cells.length) return null;
    const tips = new Map([...document.querySelectorAll('tool-tip[for]')].map(t => [t.getAttribute('for'), t.textContent]));
    const days = cells.map(c => {
      const text = tips.get(c.id) || c.getAttribute('aria-label') || c.textContent || '';
      const count = /^no contributions/i.test(text.trim()) ? 0 : n((text.match(/([\d,]+)\s+contributions?/i) || [])[1] || c.dataset.count || 0);
      return { date: c.dataset.date, level: +c.dataset.level || 0, count };
    }).filter(d => d.date).sort((a, b) => a.date.localeCompare(b.date));
    const today = new Date().toISOString().slice(0, 10);
    const past = days.filter(d => d.date <= today);
    const heading = [...document.querySelectorAll('h2')].map(h => h.textContent.replace(/\s+/g, ' ').trim()).find(t => /contributions? in (the last year|\d{4})/i.test(t)) || '';
    const total = heading ? n(heading.match(/([\d,]+)\s+contribution/i)?.[1] || 0) : past.reduce((a, d) => a + d.count, 0);
    const active = past.filter(d => d.count > 0 || d.level > 0);
    let longest = 0, run = 0; for (const d of past) { run = d.count > 0 || d.level > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
    let current = 0; for (let i = past.length - 1; i >= 0; i--) { const on = past[i].count > 0 || past[i].level > 0; if (on) current++; else if (i === past.length - 1) continue; else break; }
    const busiest = past.reduce((a, d) => (d.count > a.count ? d : a), { count: 0 });
    const byDay = Array(7).fill(0), byMonth = new Map();
    for (const d of past) { const dt = new Date(d.date + 'T00:00:00'); byDay[dt.getDay()] += d.count; const k = d.date.slice(0, 7); byMonth.set(k, (byMonth.get(k) || 0) + d.count); }
    const counted = past.some(d => d.count > 0);
    return { heading, total, days: past.length, active: active.length, longest, current, busiest, counted,
      bestDay: counted ? DAYS[byDay.indexOf(Math.max(...byDay))] : '', months: [...byMonth.entries()].slice(-12) };
  }

  function user() {
    const seg = location.pathname.split('/').filter(Boolean);
    return seg.length === 1 ? seg[0] : null;
  }

  // ---------------------------------------------------------------- the panel
  let host, root;
  function mount() {
    if (host) return;
    host = document.createElement('div'); host.id = 'contrib-decoded-host';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<link rel="stylesheet" href="${chrome.runtime.getURL('panel.css')}">
      <button class="tab" title="Contributions Decoded">?<span>Explain</span></button>
      <aside class="panel"><header><img src="${chrome.runtime.getURL('icons/32.png')}" alt=""><b>Contributions Decoded</b>
      <label class="sw" title="Show the plain-English notes on the page"><input type="checkbox" checked> Notes</label>
      <button class="close" title="Close">×</button></header><div class="body"></div></aside>`;
    document.documentElement.appendChild(host);
    root.querySelector('.tab').onclick = () => { root.querySelector('.panel').classList.add('open'); render(); };
    root.querySelector('.close').onclick = () => root.querySelector('.panel').classList.remove('open');
    root.querySelector('.sw input').onchange = e => {
      notesOn = e.target.checked; chrome.storage.local.set({ notesOn });
      document.querySelectorAll('.cd-note').forEach(x => (x.style.display = notesOn ? 'flex' : 'none'));
    };
  }

  function render() {
    const c = readCalendar(), u = user(), body = root.querySelector('.body');
    if (!c) { body.innerHTML = `<p class="muted">Scroll down to the contribution calendar so GitHub loads it, then open this again.</p>`; return; }
    const perWeek = c.total / Math.max(1, c.days / 7);
    const max = Math.max(1, ...c.months.map(m => m[1]));
    body.innerHTML = `
      <h2>@${esc(u)}</h2>
      <div class="big"><b>${fmt(c.total)}</b><span>contributions ${/\d{4}/.test(c.heading) && !/last year/i.test(c.heading) ? 'in ' + esc(c.heading.match(/\d{4}/)[0]) : 'in the last year'}</span></div>
      <p class="lead">That's about <b>${perWeek >= 1 ? Math.round(perWeek) + ' a week' : (perWeek * 4.3).toFixed(1) + ' a month'}</b>. They were active on <b>${fmt(c.active)} of ${fmt(c.days)} days</b> (${Math.round((c.active / Math.max(1, c.days)) * 100)}%).</p>
      <ul class="tiles">
        <li><b>${plural(c.current, 'day')}</b><span>current streak</span></li>
        <li><b>${plural(c.longest, 'day')}</b><span>longest streak</span></li>
        ${c.counted ? `<li><b>${fmt(c.busiest.count)}</b><span>busiest day · ${esc(new Date(c.busiest.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}</span></li>
        <li><b>${esc(c.bestDay)}</b><span>most active weekday</span></li>` : ''}
      </ul>
      ${c.counted ? `<h3>Month by month</h3><div class="months">${c.months.map(([k, v]) => `<div title="${fmt(v)} in ${MONTHS[+k.slice(5) - 1]} ${k.slice(0, 4)}"><i style="height:${Math.max(2, (v / max) * 64)}px"></i><span>${MONTHS[+k.slice(5) - 1][0]}</span></div>`).join('')}</div>` : ''}
      <h3>Reading the green squares</h3>
      <p>Each square is <b>one day</b>; each column is <b>one week</b> (Sunday at the top). The darker the colour, the more they did that day. Grey means nothing that day. Hover a square on the page to see the exact number.</p>
      <h3>What counts as a contribution</h3>
      <ul class="list">
        <li><b>Commits</b>: saved changes, but only on a project's main branch and not in forks (copies of other people's projects).</li>
        <li><b>Pull requests</b> opened: proposals to add changes.</li>
        <li><b>Issues</b> opened: bug reports, ideas, to-dos.</li>
        <li><b>Reviews</b> of other people's pull requests.</li>
        <li><b>New repositories</b> and discussions.</li>
      </ul>
      <p class="muted">Days follow UTC, so late-night work in India (after 5:30 am IST is the new day) can land on a different square than you expect.</p>
      <h3>Words you'll see</h3>
      <dl>
        <dt>Repository (repo)</dt><dd>A project folder: code plus its full history.</dd>
        <dt>Commit</dt><dd>One saved change with a message describing it.</dd>
        <dt>Branch</dt><dd>A separate line of work; "main" is the official one.</dd>
        <dt>Pull request (PR)</dt><dd>"Please add my changes": others review before merging.</dd>
        <dt>Merged</dt><dd>The PR was accepted; its changes are now in the main code.</dd>
        <dt>Closed</dt><dd>The PR or issue was finished or rejected without merging.</dd>
        <dt>+120 −30</dt><dd>120 lines added, 30 lines removed.</dd>
        <dt>Fork</dt><dd>Your own copy of someone else's repo.</dd>
        <dt>Star</dt><dd>A bookmark or "like" on a repo.</dd>
      </dl>`;
  }

  async function run() {
    if (!user() || !document.querySelector('.js-yearly-contributions, .ContributionCalendar, [data-date][data-level], .contribution-activity-listing')) {
      if (host) host.style.display = 'none'; return;
    }
    mount(); host.style.display = '';
    annotateActivity();
  }

  chrome.storage.local.get('notesOn').then(v => { if (v.notesOn === false) { notesOn = false; } run(); });
  // GitHub loads the calendar and "Show more activity" later, and swaps pages without reloading
  new MutationObserver(() => { clearTimeout(run.t); run.t = setTimeout(run, 400); }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('turbo:load', run);
})();
