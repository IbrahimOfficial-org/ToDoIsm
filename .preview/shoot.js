// One-off preview script: serves index.html and screenshots it at several viewports.
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

  // Seed some tasks so the layout isn't empty.
  await page.addInitScript(() => {
    const tasks = [
      { id: 1, title: 'Design the new landing page', time: '9:41 AM', date: new Date().toISOString().slice(0,10), tag: 'Work', color: 'green', priority: true, done: false },
      { id: 2, title: 'Reply to Sarah about the Q3 review', time: '10:15 AM', date: new Date().toISOString().slice(0,10), tag: 'Work', color: 'purple', priority: false, done: false },
      { id: 3, title: 'Buy groceries for the weekend', time: '11:02 AM', date: new Date().toISOString().slice(0,10), tag: 'Personal', color: 'pink', priority: false, done: true },
      { id: 4, title: 'Book dentist appointment', time: '12:30 PM', date: new Date().toISOString().slice(0,10), tag: 'Health', color: 'yellow', priority: false, done: false },
      { id: 5, title: 'Morning run in the park', time: '1:20 PM', date: new Date().toISOString().slice(0,10), tag: 'Health', color: 'blue', priority: false, done: false }
    ];
    localStorage.setItem('taskflow:tasks:v1', JSON.stringify(tasks));
  });

  const shots = [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'phone-390', width: 390, height: 844 },
    { name: 'tiny-320', width: 320, height: 700 }
  ];

  for (const s of shots) {
    await page.setViewportSize({ width: s.width, height: s.height });
    await page.goto(url);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: false });
    console.log('captured', s.name);
  }

  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
