import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, 'assets', 'play-store');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function createPromoGraphic(browser, rawPath, outputName, title, subtitle) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Teko:wght@500;700&family=Inter:wght@400;600&display=swap');
        
        body, html {
          margin: 0;
          padding: 0;
          width: 1080px;
          height: 1080px;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #000000 100%);
          font-family: 'Teko', sans-serif;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .bg-elements {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: 
            radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.1) 0%, transparent 50%);
          z-index: 1;
        }

        .header {
          z-index: 10;
          text-align: center;
          margin-top: 80px;
          text-transform: uppercase;
        }

        h1 {
          font-size: 130px;
          color: #e0e7ff;
          margin: 0;
          line-height: 1;
          letter-spacing: 2px;
          text-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }

        .phone-container {
          position: absolute;
          bottom: -50px;
          width: 430px;
          height: 870px;
          background: #000;
          border-radius: 60px;
          padding: 14px;
          box-shadow: 
            0 30px 60px rgba(0,0,0,0.6),
            inset 0 0 0 2px #444,
            inset 0 0 0 6px #111;
          z-index: 10;
          transform: perspective(1000px) rotateX(5deg) scale(1.05);
        }

        .phone-screen {
          width: 100%;
          height: 100%;
          border-radius: 46px;
          overflow: hidden;
          background: #000;
          position: relative;
        }

        .phone-screen img {
          width: 100%;
          height: auto;
          display: block;
        }

        .notch {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 30px;
          background: #000;
          border-bottom-left-radius: 20px;
          border-bottom-right-radius: 20px;
          z-index: 20;
        }

        .footer {
          position: absolute;
          bottom: 30px;
          left: 0; right: 0;
          z-index: 10;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
        }
        
        .footer-text {
          font-family: 'Inter', sans-serif;
          color: #e0e7ff;
          font-size: 24px;
          font-weight: 400;
        }
      </style>
    </head>
    <body>
      <div class="bg-elements"></div>
      <div class="header">
        <h1>${title}</h1>
      </div>
      <div class="phone-container">
        <div class="phone-screen">
          <div class="notch"></div>
          <img src="file:///${rawPath.replace(/\\/g, '/')}" />
        </div>
      </div>
      <div class="footer">
        <div class="footer-text">MOTION OS - Master Your Time</div>
      </div>
    </body>
    </html>
  `;
  
  const tempHtmlPath = path.join(outDir, 'temp.html');
  fs.writeFileSync(tempHtmlPath, htmlContent);

  const context = await browser.newContext({
    viewport: { width: 1080, height: 1080 }
  });
  const page = await context.newPage();
  await page.goto(`file:///${tempHtmlPath.replace(/\\/g, '/')}`);
  await page.waitForTimeout(1000); // fonts
  
  await page.screenshot({ path: path.join(outDir, outputName) });
  await context.close();
  fs.unlinkSync(tempHtmlPath);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  const mobileContext = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark', // force dark mode to match promo
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await mobileContext.newPage();
  console.log('Navigating to http://localhost:5173');
  
  // Navigate to app first to get correct origin for localStorage
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem('motion-os:settings:v1', JSON.stringify({
      onboarded: true,
      birth: '1995-01-01T00:00:00.000Z',
      name: 'Guest',
      motionBlur: true,
      showMs: true,
      yearView: 'dots',
      lifeExpectancy: 80,
      h24: true,
      widgetTheme: 'dark',
      theme: 'dark'
    }));
  });

  // Reload to apply settings
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  const rawToday = path.join(outDir, 'raw_today.png');
  const rawTasks = path.join(outDir, 'raw_tasks.png');
  const rawFocus = path.join(outDir, 'raw_focus.png');
  const rawHabits = path.join(outDir, 'raw_habits.png');
  
  console.log('Capturing Today...');
  await page.screenshot({ path: rawToday });
  
  console.log('Capturing Tasks...');
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: rawTasks });
  
  console.log('Capturing Focus...');
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: rawFocus });
  
  console.log('Capturing Habits...');
  await page.getByRole('button', { name: 'Habits', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: rawHabits });

  await mobileContext.close();

  console.log('Generating Promo Graphics...');
  await createPromoGraphic(browser, rawToday, 'promo_today.png', 'SEIZE THE DAY', 'Your daily overview at a glance');
  await createPromoGraphic(browser, rawTasks, 'promo_tasks.png', 'GET IT DONE', 'Manage tasks effectively');
  await createPromoGraphic(browser, rawFocus, 'promo_focus.png', 'STAY FOCUSED', 'Timer and focus sessions');
  await createPromoGraphic(browser, rawHabits, 'promo_habits.png', 'BUILD HABITS', 'Track and maintain streaks');

  await browser.close();
  console.log('All done!');
})();
