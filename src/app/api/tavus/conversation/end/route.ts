/**
 * POST /api/tavus/conversation/end
 *
 * Ends a live Tavus conversation so the room stops consuming conversation
 * minutes. Called when the student ends the session, leaves the page, or the
 * component unmounts.
 *
 * This is a POST (not DELETE) so it can also be called with
 * navigator.sendBeacon() during page unload, which only supports POST.
 *
 * Request:  { conversationId: string }
 * Response: { ok: true }
 */

import { NextResponse } from 'next/server';
import { endTavusConversation, isTavusConfigured } from '@/lib/tavus.server';

export async function POST(req: Request) {
  if (!isTavusConfigured()) {
    return NextResponse.json({ ok: true });
  }

  let conversationId = '';

  try {
    // sendBeacon may deliver text/plain rather than application/json
    const raw = await req.text();
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    if (typeof parsed.conversationId === 'string') conversationId = parsed.conversationId;
  } catch {
    conversationId = '';
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required.' }, { status: 400 });
  }

  try {
    await endTavusConversation(conversationId);
  } catch (error) {
    // Never surface cleanup failures to the student — the call is already over.
    console.error(
      '[/api/tavus/conversation/end]',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  return NextResponse.json({ ok: true });
}
