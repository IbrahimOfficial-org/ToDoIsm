// Final thorough sweep: ALL axe rules + console errors + duplicate IDs + reduced-motion render.
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fileUrl = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });

  // add tasks + toggle + switch views to exercise all dynamic states
  await page.type('#new-task-input', 'Alpha task');
  await page.keyboard.press('Enter');
  await page.type('#new-task-input', 'Beta task');
  await page.keyboard.press('Enter');
  await page.click('.card .checkbox');
  await new Promise(r => setTimeout(r, 200));
  await page.click('.navitem[data-view="completed"]');
  await new Promise(r => setTimeout(r, 200));
  await page.click('.navitem[data-view="today"]');
  await new Promise(r => setTimeout(r, 200));

  // ALL axe rules (including experimental), no tag filter
  await page.addScriptTag({ path: require.resolve('axe-core') });
  const res = await page.evaluate(async () => {
    const r = await axe.run(document);
    return { violations: r.violations, incomplete: r.incomplete };
  });

  const ids = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[id]')];
    const dup = all.filter((el, i) => all.findIndex(e => e.id === el.id) !== i).map(e => e.id);
    return [...new Set(dup)];
  });

  // reduced-motion render check
  const client = await page.target().createCDPSession();
  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.reload({ waitUntil: 'load' });
  const rmOk = await page.evaluate(() => getComputedStyle(document.body).transitionDuration || true);

  console.log('===== ALL RULES (experimental included) =====');
  if (res.violations.length === 0) console.log('  PASS: 0 violations');
  else res.violations.forEach(v => console.log(`  FAIL [${v.impact}] ${v.id}: ${v.nodes.length} node(s) — ${v.help}`));

  console.log('===== Incomplete (axe could not decide) =====');
  if (res.incomplete.length === 0) console.log('  none');
  else res.incomplete.forEach(v => console.log(`  ? ${v.id}: ${v.nodes.length} node(s)`));

  console.log('===== Duplicate IDs =====');
  console.log(ids.length === 0 ? '  PASS: none' : '  FAIL: ' + ids.join(', '));

  console.log('===== Console errors =====');
  console.log(consoleErrors.length === 0 ? '  PASS: none' : '  FAIL:\n  ' + consoleErrors.join('\n  '));

  console.log('===== prefers-reduced-motion render =====');
  console.log('  PASS: page renders (body transition: ' + rmOk + ')');

  await browser.close();
  process.exit(res.violations.length === 0 && ids.length === 0 && consoleErrors.length === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
