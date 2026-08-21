import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOpenAIClient } from '@/lib/openai';

const bodySchema = z.object({ target: z.string().min(1).max(500), question: z.string().max(4000).optional() });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const client = getOpenAIClient();
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5',
      input: [
        { role: 'system', content: 'You are an enterprise investigation analyst. Return evidence-conscious analysis. Do not invent sources, identities, or facts. Separate verified evidence, inference, unknowns, and recommended next collection steps. This endpoint currently receives only the analyst target, so do not claim external verification.' },
        { role: 'user', content: `Target: ${body.target}\nQuestion: ${body.question || 'Create an investigation plan and explain what evidence should be collected.'}` },
      ],
    });

    return NextResponse.json({ ok: true, target: body.target, analysis: response.output_text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Investigation request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
