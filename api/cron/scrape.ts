import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
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