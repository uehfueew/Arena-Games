const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
      console.log('PAGE ERROR STACK:', err.stack);
  });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:3000/games/tictactoe/index.html?mode=arcade', {waitUntil: 'networkidle0'});
  await browser.close();
})();
