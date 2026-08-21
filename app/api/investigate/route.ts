import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/openai';
import { AI_CONFIG, assertAIConfiguration } from '@/lib/ai-config';

const bodySchema = z.object({
  target: z.string().trim().min(1).max(500),
  question: z.string().trim().max(4000).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    assertAIConfiguration();
    const client = getAIClient();

    const response = await client.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content:
            'You are an enterprise investigation analyst. Return evidence-conscious analysis. Never invent sources, identities, or facts. Separate verified evidence, inference, unknowns, and recommended next collection steps. This endpoint currently receives only the analyst target, so do not claim external verification.',
        },
        {
          role: 'user',
          content: `Target: ${body.target}\nQuestion: ${body.question || 'Create an investigation plan and explain what evidence should be collected.'}`,
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      provider: AI_CONFIG.provider,
      model: AI_CONFIG.model,
      target: body.target,
      analysis: response.choices[0]?.message?.content ?? '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Investigation request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
