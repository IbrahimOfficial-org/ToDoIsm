// Test the mobile sidebar toggle behavior
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = __dirname;

const server = http.createServer((req, res) => {
  let file = path.join(ROOT, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); res.end('err'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const url = `http://localhost:${port}/`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Seed tasks
  await page.addInitScript(() => {
    const tasks = [
      { id: 1, title: 'Design the new landing page', time: '9:41 AM', date: new Date().toISOString().slice(0,10), tag: 'Work', color: 'green', priority: true, done: false },
      { id: 2, title: 'Reply to Sarah about Q3 review', time: '10:15 AM', date: new Date().toISOString().slice(0,10), tag: 'Work', color: 'purple', priority: false, done: false }
    ];
    localStorage.setItem('taskflow:tasks:v1', JSON.stringify(tasks));
  });

  // Mobile viewport (390x844 - iPhone 12/13)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.waitForTimeout(300);

  // Closed state
  await page.screenshot({ path: path.join(OUT, 'mobile-closed.png') });
  console.log('captured mobile-closed');

  // Click menu toggle
  await page.click('#menu-toggle');
  await page.waitForTimeout(350);

  // Open state
  await page.screenshot({ path: path.join(OUT, 'mobile-open.png') });
  console.log('captured mobile-open');

  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
