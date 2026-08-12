/**
 * POST /api/tavus/conversation
 *
 * Creates a Tavus CVI conversation for a scenario and returns the join URL.
 * The Tavus API key stays on the server — the browser only ever sees the
 * short-lived room URL.
 *
 * Request:  { scenarioId: string }
 * Response: { conversationId, conversationUrl, meetingToken?, faceLabel }
 *           { error: string, unavailable?: true } on failure
 */

import { NextResponse } from 'next/server';
import { scenarios } from '@/lib/scenarios';
import { createTavusConversation, isTavusConfigured } from '@/lib/tavus.server';

export async function POST(req: Request) {
  if (!isTavusConfigured()) {
    return NextResponse.json(
      { error: 'Live video patients are not configured on this server.', unavailable: true },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : '';

  if (!scenarioId) {
    return NextResponse.json({ error: 'scenarioId is required.' }, { status: 400 });
  }

  const scenario = scenarios.find((item) => item.id === scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });
  }
  if (scenario.availability !== 'available') {
    return NextResponse.json(
      { error: scenario.safetyNote ?? 'This scenario is unavailable.' },
      { status: 403 },
    );
  }

  try {
    const conversation = await createTavusConversation(scenario);
    return NextResponse.json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/tavus/conversation]', message);

    // Concurrency / quota exhaustion is the most common demo-day failure.
    const isCapacity = /concurren|quota|limit|maximum/i.test(message);
    return NextResponse.json(
      {
        error: isCapacity
          ? 'All live video patients are currently in use. Try the stylised avatar, or wait a moment and retry.'
          : 'The live video patient could not be started. Try the stylised avatar instead.',
      },
      { status: isCapacity ? 429 : 502 },
    );
  }
}
