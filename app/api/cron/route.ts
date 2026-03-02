import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sql = getDb();
    
    // Get all journals
    const journals = await sql`SELECT id, name FROM journals`;
    
    console.log(`Scraping ${journals.length} journals...`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Scraper running for ${journals.length} journals`,
      journals: journals
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Scraper failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}