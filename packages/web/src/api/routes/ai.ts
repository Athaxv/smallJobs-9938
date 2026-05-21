import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, requireAuth } from '../middleware/auth';
import type { auth } from '../auth';

type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session.session;
type Variables = { user: User | null; session: Session | null };

// Groq key — stored as GROQ_API_KEY, fallback to legacy OPENAI_API_KEY name
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL = 'openai/gpt-oss-120b';

if (!GROQ_API_KEY && process.env.NODE_ENV !== 'production') {
  console.error('[AI] GROQ_API_KEY is missing — AI routes will return errors');
}

async function chat(messages: { role: string; content: string }[]): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.6 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

const aiRoutes = new Hono<{ Variables: Variables }>()
  .use('*', authMiddleware)
  .use('*', requireAuth)

  // POST /api/ai/analyze — raw request → follow-up questions with options
  .post(
    '/analyze',
    zValidator('json', z.object({ request: z.string().min(5).max(600) })),
    async (c) => {
      const { request } = c.req.valid('json');

      try {
        const content = await chat([
          {
            role: 'system',
            content: `You are an AI assistant for SmallJobs — a hyperlocal community app in India where people post small requests (errands, hangouts, study help, creative gigs, food delivery, etc.).

Your job: read the request carefully and generate 2-3 smart, context-aware follow-up questions.

Rules:
- Max 3 questions, min 2
- Each question must have 3-4 short option choices
- Questions must be specific to THIS request — not generic
- ALWAYS include a payment/compensation question UNLESS the user already mentioned a specific amount. Do NOT use fixed ranges — infer appropriate INR amounts based on the task's effort, skill, and time involved. Examples:
  - Quick errand (buy something, deliver item): ₹50-100, ₹100-200, ₹200+, Free/favour
  - Food/grocery run: ₹50-150, ₹150-300, ₹300+, Free/favour
  - Study help / tutoring (1-2 hrs): ₹100-300, ₹300-600, ₹600+, Free/exchange
  - Heavy physical task (moving, shifting, labour): ₹500-1000, ₹1000-2000, ₹2000+, Negotiable
  - Skilled work (design, coding, photography): ₹500-1500, ₹1500-3000, ₹3000+, Equity/barter
  - Hangout / social / casual: Free, Pay for my meal, Split costs, Small treat
  - Creative gig: ₹300-800, ₹800-2000, ₹2000+, Barter/collab
  Always include a "Free / just for fun" or "Negotiable" option where appropriate.
- Always ask about timing/urgency — phrase the question contextually (e.g. "When do you need this?" not just "Urgency?")
- Only ask about in-person vs online if genuinely ambiguous. For physical tasks, skip this.
- Questions in English, casual and friendly tone
- Return ONLY valid JSON, no markdown fences, no commentary.

Output format (strict):
{"questions":[{"question":"...","options":["...","...","..."]}]}`,
          },
          { role: 'user', content: request },
        ]);

        const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned) as { questions: { question: string; options: string[] }[] };
        return c.json({ ok: true, questions: parsed.questions }, 200);
      } catch (err) {
        console.error('[AI /analyze]', err);
        return c.json({ ok: false, error: 'AI unavailable' }, 500);
      }
    }
  )

  // POST /api/ai/structure — request + answers → structured thread object
  .post(
    '/structure',
    zValidator('json', z.object({
      request: z.string().min(5).max(600),
      answers: z.array(z.string()),
    })),
    async (c) => {
      const { request, answers } = c.req.valid('json');
      const answersText = answers.map((a, i) => `Answer ${i + 1}: ${a}`).join('\n');

      try {
        const content = await chat([
          {
            role: 'system',
            content: `You are an AI assistant for SmallJobs — a hyperlocal community app in India.

Given a user's raw request and their follow-up answers, return a structured thread object.

Rules:
- title: max 70 chars. Must be specific and action-oriented — reflect the actual task (what, where if relevant, key detail). NOT generic. Bad: "Need help with task". Good: "Need someone to pick up meds from Apollo Pharmacy today".
- body: 1-2 sentences that naturally expand the request with the most useful details from their answers. Max 180 chars. Should read like a real post a person wrote — not robotic or template-like.
- type: MUST be "local" for anything requiring physical presence OR location proximity. Use "remote" ONLY when explicitly digital/online with zero physical meetup. Use "interest" for hobby/social discovery. Default to "local" when in doubt.
- category: one of: errands, hangout, walk, creative, study, food, chat
- tags: 2-5 lowercase tags that are SPECIFIC to this request. Derive from the task itself — what it involves, the skill or item, the context. Bad: ["task","help","request"]. Good: ["pharmacy","delivery","medicine","urgent"] or ["dslr","photography","shoot","portrait"]. Never use generic filler tags.
- isPaid: true ONLY if the user explicitly confirmed payment in their answers. Never assume.
- amount: extract the midpoint INR number from their chosen range only if isPaid is true. E.g. if they said "₹100-200" use 150. Never invent.
- urgency: "asap" | "today" | "this_week" | "flexible" — infer from their answer
- visibility: one natural sentence about who can see/respond to this

Return ONLY valid JSON, no markdown fences, no commentary.

Output format (strict):
{"title":"...","body":"...","type":"local","category":"errands","tags":["..."],"isPaid":false,"urgency":"today","visibility":"..."}`,
          },
          {
            role: 'user',
            content: `Request: ${request}\n\n${answersText}`,
          },
        ]);

        const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return c.json({ ok: true, thread: parsed }, 200);
      } catch (err) {
        console.error('[AI /structure]', err);
        return c.json({ ok: false, error: 'AI unavailable' }, 500);
      }
    }
  );

export default aiRoutes;
