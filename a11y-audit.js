// Accessibility audit for Listism (index.html) using axe-core + system Chrome.
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fileUrl = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

function summarize(violations) {
  const out = [];
  for (const v of violations) {
    out.push({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map(n => ({
        target: n.target.join(' '),
        html: n.html.slice(0, 160),
        summary: n.failureSummary ? n.failureSummary.split('\n')[0] : ''
      }))
    });
  }
  return out;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();

  const runAxe = async (label) => {
    await page.addScriptTag({ path: require.resolve('axe-core') });
    const res = await page.evaluate(async (tags) => {
      const r = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
      return r.violations;
    }, TAGS);
    console.log(`\n===== ${label} =====`);
    if (res.length === 0) {
      console.log('  PASS: 0 violations');
    } else {
      console.log(`  FAIL: ${res.length} violation(s)`);
      for (const v of summarize(res)) {
        console.log(`\n  [${v.impact}] ${v.id}: ${v.help}`);
        console.log(`    ${v.helpUrl}`);
        for (const n of v.nodes.slice(0, 4)) {
          console.log(`    - ${n.target} | ${n.html}`);
          if (n.summary) console.log(`      ${n.summary}`);
        }
        if (v.nodes.length > 4) console.log(`    ... and ${v.nodes.length - 4} more`);
      }
    }
    return res.length;
  };

  let total = 0;

  // 1. Desktop, empty state
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(fileUrl, { waitUntil: 'load' });
  total += await runAxe('Desktop 1440px (empty state)');

  // 2. Mobile, sidebar closed
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(fileUrl, { waitUntil: 'load' });
  total += await runAxe('Mobile 390px (sidebar closed)');

  // 3. Mobile, sidebar open
  await page.click('#menu-toggle');
  await new Promise(r => setTimeout(r, 400));
  total += await runAxe('Mobile 390px (sidebar open)');
  await page.keyboard.press('Escape'); // close via Escape

  // 4. Desktop with tasks: add several tasks, toggle one done, search
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(fileUrl, { waitUntil: 'load' });
  const addTask = async (title) => {
    await page.type('#new-task-input', title);
    await page.keyboard.press('Enter');
  };
  await addTask('Buy groceries');
  await addTask('Write accessibility report');
  await addTask('Call the dentist');
  // toggle the first one done
  const firstCheckbox = await page.$('.card .checkbox');
  await firstCheckbox.click();
  // search that matches nothing -> empty-search state
  await page.type('#search-input', 'zzzznothing');
  total += await runAxe('Desktop with tasks + done + search-empty');

  // 5. Keyboard smoke test: Tab through and confirm focus is always visible/valid
  await page.goto(fileUrl, { waitUntil: 'load' });
  await addTask('Keyboard test task');
  const focusLog = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        tag: el.tagName,
        id: el.id || '',
        cls: typeof el.className === 'string' ? el.className : '',
        label: el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 40),
        visible: r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        opacity: style.opacity
      };
    });
    if (info) focusLog.push(info);
  }
  const invisible = focusLog.filter(f => !f.visible || f.opacity === '0');
  console.log(`\n===== Keyboard focus smoke test =====`);
  if (invisible.length === 0) {
    console.log(`  PASS: all ${focusLog.length} tab stops landed on visible elements`);
  } else {
    console.log(`  FAIL: ${invisible.length} invisible tab stop(s)`);
    invisible.forEach(f => console.log('   -', JSON.stringify(f)));
  }

  // 6. Keyboard toggle + delete smoke test (isolated storage)
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await addTask('Tab me');
  await page.evaluate(() => {
    const cb = document.querySelector('.card .checkbox');
    cb.focus();
  });
  await page.keyboard.press('Enter'); // toggle via keyboard
  await new Promise(r => setTimeout(r, 300)); // let async render settle
  const toggleResult = await page.evaluate(() => {
    const active = document.activeElement;
    return {
      // card left the Today view when marked done, focus should have moved to the heading
      cardGone: !document.querySelector('.card'),
      focusTarget: active ? (active.id || active.className || active.tagName) : 'body'
    };
  });
  console.log(`\n===== Keyboard checkbox toggle =====`);
  const toggleWorked = toggleResult.cardGone && toggleResult.focusTarget === 'tasks-heading';
  console.log(toggleWorked
    ? `  PASS: Enter toggled the task; card left the view, focus moved to heading (${toggleResult.focusTarget})`
    : `  FAIL: ${JSON.stringify(toggleResult)}`);

  // 7. Sidebar keyboard: nav items activate with Enter/Space, Escape closes the drawer
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'load' });
  await page.click('#menu-toggle');
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.press('Tab'); // focus first nav item (Today)
  const navFocused = await page.evaluate(() => {
    const el = document.activeElement;
    return el && el.classList.contains('navitem') ? el.dataset.view : null;
  });
  await page.keyboard.press('ArrowDown'); // should NOT navigate (button semantics)
  const navStillFocused = await page.evaluate(() => {
    const el = document.activeElement;
    return el && el.classList.contains('navitem');
  });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 200));
  const closed = await page.evaluate(() => ({
    expanded: document.getElementById('menu-toggle').getAttribute('aria-expanded'),
    sidebarInert: document.getElementById('sidebar').inert
  }));
  console.log(`\n===== Sidebar keyboard =====`);
  const sidebarOk = navFocused === 'today' && navStillFocused && closed.expanded === 'false' && closed.sidebarInert === true;
  console.log(sidebarOk
    ? `  PASS: nav focusable via Tab (${navFocused}), Escape closes (aria-expanded=${closed.expanded}, inert=${closed.sidebarInert})`
    : `  FAIL: navFocused=${navFocused} navStillFocused=${navStillFocused} closed=${JSON.stringify(closed)}`);

  await browser.close();
  console.log(`\nDONE. Total violations across all runs: ${total}`);
  process.exit(total === 0 ? 0 : 1);
})().catch(err => { console.error(err); process.exit(2); });
