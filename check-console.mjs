import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    console.log('Navigating to http://localhost:5173...');
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('PAGE ERROR:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('UNCAUGHT EXCEPTION:', error.message);
    });

    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Navigation complete. Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    
    await browser.close();
  } catch (err) {
    console.error('PUPPETEER ERROR:', err);
  }
})();
