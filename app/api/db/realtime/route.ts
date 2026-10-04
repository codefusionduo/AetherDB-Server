import { NextRequest, NextResponse } from 'next/server';
import { getBaasEngine } from '@/lib/db-server/server-state';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const baas = getBaasEngine();
    const events = baas.getRealtimeEvents();
    return NextResponse.json({ success: true, events, count: events.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'emit', eventType = 'INSERT', entityType = 'SQL_TABLE', entityName = 'test', payload = {} } = body;
    const baas = getBaasEngine();

    if (action === 'clear') {
      baas.clearRealtimeEvents();
      return NextResponse.json({ success: true, message: 'Realtime events cleared' });
    }

    const event = baas.emitRealtimeEvent(eventType, entityType, entityName, payload);
    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
