import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Verify the cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runScraper();
    return NextResponse.json({ success: true, message: 'Scraper ran successfully' });
  } catch (error) {
    console.error('Scraper error:', error);
    return NextResponse.json({ error: 'Scraper failed' }, { status: 500 });
  }
}

function runScraper(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'scrape']);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Scraper exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}