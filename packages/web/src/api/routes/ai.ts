import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireAuth } from "../middleware/auth";
import type { auth } from "../auth";
import {
  buildAnalyzeSystemPrompt,
  buildStructureSystemPrompt,
  sanitizeAnalyzeResult,
  hasTimeSignal,
  hasUrgentSignal,
  inferUrgencyFromRequestAndAnswers,
  isInferredUrgency,
  type AnalyzeResult,
} from "../../shared/ai-prompts";
import { webSearch } from "../lib/web-search";
import { isUrgency, resolveExpiresAtInput, type Urgency } from "../lib/post-expiry";

type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session.session;
type Variables = { user: User | null; session: Session | null };

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

if (!GROQ_API_KEY && process.env.NODE_ENV !== "production") {
  console.error("[AI] GROQ_API_KEY is missing — AI routes will return errors");
}

async function chat(
  messages: { role: string; content: string }[],
  temperature = 0.3,
): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const res = await fetch(GROQ_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

function parseJsonContent<T>(content: string): T {
  const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

function resolveThreadUrgency(
  parsed: Record<string, unknown>,
  request: string,
  answers: string[],
  known?: Record<string, string>,
): Urgency {
  if (known?.urgency && isInferredUrgency(known.urgency)) {
    return known.urgency;
  }

  const fromText = inferUrgencyFromRequestAndAnswers(request, answers);
  if (fromText) return fromText;

  if (isUrgency(String(parsed.urgency ?? ""))) {
    return parsed.urgency as Urgency;
  }

  return "today";
}

function defaultTimingSummary(urgency: Urgency): string | undefined {
  if (urgency === "asap") return "Expires in 2 hours";
  if (urgency === "today") return "Expires in 24 hours";
  if (urgency === "this_week") return "Expires in 7 days";
  if (urgency === "flexible") return "Expires in 3 days";
  return undefined;
}

function normalizeStructuredThread(
  parsed: Record<string, unknown>,
  request: string,
  answers: string[],
  known?: Record<string, string>,
): Record<string, unknown> {
  const urgency = resolveThreadUrgency(parsed, request, answers, known);

  const expiresAt = resolveExpiresAtInput({
    expiresAt: parsed.expiresAt ? String(parsed.expiresAt) : null,
    urgency,
  });

  return {
    ...parsed,
    urgency,
    expiresAt: expiresAt.toISOString(),
    timingSummary: parsed.timingSummary ?? defaultTimingSummary(urgency),
  };
}

const aiRoutes = new Hono<{ Variables: Variables }>()
  .use("*", authMiddleware)
  .use("*", requireAuth)

  .post(
    "/analyze",
    zValidator("json", z.object({ request: z.string().min(5).max(600) })),
    async (c) => {
      const { request } = c.req.valid("json");
      const now = new Date();

      try {
        let searchContext = "";
        if (!hasTimeSignal(request) && !hasUrgentSignal(request)) {
          const snippets = await webSearch(`current time ${now.toISOString()} ${request} deadline when`);
          if (snippets) {
            searchContext = `\n\nWeb search context (use to infer timing if helpful):\n${snippets}`;
          }
        }

        const content = await chat([
          { role: "system", content: buildAnalyzeSystemPrompt(now) },
          { role: "user", content: request + searchContext },
        ]);

        const parsed = parseJsonContent<{
          complete?: boolean;
          intent?: string;
          known?: Record<string, string>;
          questions?: { question: string; options: string[] }[];
        }>(content);

        const result: AnalyzeResult = sanitizeAnalyzeResult(request, parsed);

        return c.json({
          ok: true,
          complete: result.complete,
          intent: result.intent,
          known: result.known,
          questions: result.questions,
        }, 200);
      } catch (err) {
        console.error("[AI /analyze]", err);
        return c.json({ ok: false, error: "AI unavailable" }, 500);
      }
    },
  )

  .post(
    "/structure",
    zValidator("json", z.object({
      request: z.string().min(5).max(600),
      answers: z.array(z.string()),
      intent: z.string().optional(),
      known: z.record(z.string(), z.string()).optional(),
    })),
    async (c) => {
      const { request, answers, intent, known } = c.req.valid("json");
      const now = new Date();

      const answersText = answers.length > 0
        ? answers.map((a, i) => `Answer ${i + 1}: ${a}`).join("\n")
        : "(none — request was complete enough to skip follow-up)";

      let searchContext = "";
      if (!hasTimeSignal(request) && !hasUrgentSignal(request) && answers.every((a) => !hasTimeSignal(a))) {
        const snippets = await webSearch(`${request} when deadline time today`);
        if (snippets) {
          searchContext = `\n\nWeb search context:\n${snippets}`;
        }
      }

      const contextParts = [
        `Request: ${request}`,
        intent ? `Intent: ${intent}` : "",
        known && Object.keys(known).length > 0
          ? `Known fields: ${JSON.stringify(known)}`
          : "",
        answersText,
        searchContext,
      ].filter(Boolean).join("\n\n");

      try {
        const content = await chat([
          { role: "system", content: buildStructureSystemPrompt(now) },
          { role: "user", content: contextParts },
        ]);

        const parsed = parseJsonContent<Record<string, unknown>>(content);
        const title = String(parsed.title ?? "").trim();
        const body = String(parsed.body ?? "").trim();
        if (!title && body) {
          parsed.title = body.length > 70 ? `${body.slice(0, 67)}...` : body;
        } else if (!title) {
          parsed.title = request.length > 70 ? `${request.slice(0, 67)}...` : request;
        }
        if (!body && parsed.title) {
          parsed.body = String(parsed.title);
        }

        const thread = normalizeStructuredThread(parsed, request, answers, known);
        return c.json({ ok: true, thread }, 200);
      } catch (err) {
        console.error("[AI /structure]", err);
        return c.json({ ok: false, error: "AI unavailable" }, 500);
      }
    },
  );

export default aiRoutes;
