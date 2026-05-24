import { CATEGORY_IDS } from "./categories";

export const INTENT_TYPES = [
  "social_companion",
  "paid_task",
  "errand_local",
  "remote_help",
  "interest_discovery",
  "other",
] as const;

export type IntentType = (typeof INTENT_TYPES)[number];

export interface AIQuestion {
  question: string;
  options: string[];
}

export interface AnalyzeResult {
  complete: boolean;
  intent: IntentType;
  known: Record<string, string>;
  questions: AIQuestion[];
}

const PAY_SIGNAL =
  /₹|\bpay\b|\bpaid\b|\bpayment\b|\brupee|\bmoney\b|\bcash\b|\bfee\b|\bcharge\b|\bcompensat|\bwage|\b₹\s*\d|\b\d+\s*(rs|inr|rupees?)\b/i;

const FREE_SIGNAL = /\bfree\b|\bvolunteer\b|\bfavour\b|\bfavor\b|\bno pay\b|\bjust for fun\b/i;

const TIME_SIGNAL =
  /\b(morning|afternoon|evening|night|tonight|today|tomorrow|weekend|weekday|asap|urgent|now|soon)\b|\b\d{1,2}\s*(:\d{2})?\s*(am|pm)\b|\bby\s+\d|\bthis week\b|\bnext week\b/i;

const LOCATION_SIGNAL =
  /\bnear\b|\baround\b|\bin\s+[A-Za-z]|\bat\s+[A-Za-z]|\b(koramangala|indiranagar|jayanagar|bengaluru|bangalore|mumbai|delhi|local|nearby|my area|my neighbourhood|my neighborhood)\b/i;

const SOCIAL_SIGNAL =
  /\b(walk|run|jog|club|buddy|hangout|hang out|companion|morning run|walk club|running group|workout partner|coffee|meetup|meet up)\b/i;

const PHYSICAL_SIGNAL =
  /\b(pickup|pick up|deliver|delivery|grocer|grocery|pharmacy|medicine|errand|move|shift|ride|cab|store|shop|buy|fetch)\b/i;

const REMOTE_SIGNAL =
  /\b(online|remote|zoom|assignment|essay|code|design|tutor|study|write|homework)\b/i;

export function mentionsPay(request: string): boolean {
  return PAY_SIGNAL.test(request);
}

export function mentionsFree(request: string): boolean {
  return FREE_SIGNAL.test(request);
}

export function hasTimeSignal(request: string): boolean {
  return TIME_SIGNAL.test(request);
}

export function hasLocationSignal(request: string): boolean {
  return LOCATION_SIGNAL.test(request);
}

export function inferIntentFromRequest(request: string): IntentType {
  const lower = request.toLowerCase();
  if (SOCIAL_SIGNAL.test(lower)) return "social_companion";
  if (/\b(reads?|fan|fandom|anime|manga|manhwa|hobby|looking for people who)\b/i.test(lower)) {
    return "interest_discovery";
  }
  if (REMOTE_SIGNAL.test(lower) && !PHYSICAL_SIGNAL.test(lower)) return "remote_help";
  if (/\b(grocer|grocery|dmart|mart|pickup|pick up|deliver|errand|store|shop)\b/i.test(lower)) {
    return "errand_local";
  }
  if (PHYSICAL_SIGNAL.test(lower) || /\b(local|nearby|near me)\b/i.test(lower)) return "errand_local";
  if (mentionsPay(request)) return "paid_task";
  return "other";
}

function isPaymentQuestion(q: string): boolean {
  return /\b(pay|paying|paid|payment|compensat|fee|charge|₹|rupee|money|cost|budget|price|inr|offer anything)\b/i.test(q);
}

function isTimingQuestion(q: string): boolean {
  return /\b(when|timing|urgency|deadline|how soon|time frame|timeframe|by when)\b/i.test(q);
}

function isVisibilityQuestion(q: string): boolean {
  return /\b(nearby|online|remote|local|who can see|visibility|shown to)\b/i.test(q);
}

function isPhysicalMeetup(request: string): boolean {
  return SOCIAL_SIGNAL.test(request) || PHYSICAL_SIGNAL.test(request) || hasLocationSignal(request);
}

export function sanitizeAnalyzeResult(
  request: string,
  parsed: {
    complete?: boolean;
    intent?: string;
    known?: Record<string, string>;
    questions?: AIQuestion[];
  },
): AnalyzeResult {
  const intent = (INTENT_TYPES as readonly string[]).includes(parsed.intent ?? "")
    ? (parsed.intent as IntentType)
    : inferIntentFromRequest(request);

  const known = parsed.known ?? {};
  let questions = (parsed.questions ?? []).slice(0, 3);

  const socialOrInterest =
    intent === "social_companion" ||
    intent === "interest_discovery" ||
    (SOCIAL_SIGNAL.test(request) && !mentionsPay(request));

  questions = questions.filter((q) => {
    const text = q.question;

    if (isPaymentQuestion(text)) {
      if (socialOrInterest) return false;
      if (mentionsPay(request) || mentionsFree(request)) return false;
    }

    if (isTimingQuestion(text) && hasTimeSignal(request)) return false;

    if (isVisibilityQuestion(text)) {
      if (isPhysicalMeetup(request)) return false;
      if (intent === "errand_local" || intent === "social_companion") return false;
      if (intent === "remote_help" && REMOTE_SIGNAL.test(request)) return false;
    }

    return true;
  });

  const needsPay =
    !socialOrInterest &&
    !mentionsPay(request) &&
    !mentionsFree(request) &&
    (intent === "paid_task" || intent === "errand_local" || PHYSICAL_SIGNAL.test(request));

  const needsTime = !hasTimeSignal(request);
  const needsLocation =
    (intent === "social_companion" || intent === "errand_local") &&
    !hasLocationSignal(request);

  if (questions.length === 0 && parsed.complete !== true) {
    if (needsLocation && intent === "social_companion") {
      questions.push({
        question: "Where should people meet?",
        options: ["Near my location", "I'll share a specific spot", "Flexible / open to suggestions"],
      });
    } else if (needsTime) {
      questions.push({
        question: "When do you need this?",
        options: ["Today", "This week", "Flexible"],
      });
    } else if (needsPay) {
      questions.push({
        question: "Will you offer anything for this?",
        options: ["Free / community favour", "₹100–300", "₹300–600", "We can discuss"],
      });
    }
  }

  const complete = parsed.complete === true || questions.length === 0;

  return {
    complete,
    intent,
    known,
    questions: complete ? [] : questions.slice(0, 3),
  };
}

export const ANALYZE_SYSTEM_PROMPT = `You are an AI assistant for SmallJobs — a hyperlocal community app in India where people post small requests (errands, walks, run clubs, study help, creative gigs, hangouts, etc.).

Your job: read the request, infer intent, extract what is ALREADY known, and return ONLY follow-up questions for missing essentials (0 to 3 questions).

Step 1 — Infer intent (one of):
- social_companion: walks, runs, jog clubs, workout buddies, casual hangouts
- interest_discovery: hobby/fandom/club discovery, finding like-minded people
- errand_local: pickups, deliveries, groceries, physical local tasks
- remote_help: assignments, tutoring, online/digital help
- paid_task: explicitly paid skilled or labour work
- other: does not fit above

Step 2 — Extract known fields from the request text into "known" (only include if stated or clearly inferable):
- timing (e.g. "morning", "6am", "tonight", "this weekend")
- location (e.g. "near Koramangala", "near me", specific place)
- compensation (e.g. "free", "will pay 500", "paid")

Step 3 — Questions (0–3 ONLY):
- Ask ONLY if a field is required to create a good post AND is missing from the request
- NEVER ask about payment for walks, runs, clubs, hangouts, or social meetups unless the user mentioned paying
- NEVER ask "nearby vs online" for clearly physical activities (walk, run, pickup, delivery, meet in person)
- NEVER ask timing if the user already gave a time window (morning, 6am, tonight, today, weekend, etc.)
- Each question: 3–4 short tap options
- Casual friendly English tone

If timing, location/context, and compensation stance are all inferable → set complete: true and questions: []

Return ONLY valid JSON, no markdown fences:

{"complete":false,"intent":"social_companion","known":{"timing":"6am","location":"Koramangala","compensation":"free"},"questions":[{"question":"...","options":["...","..."]}]}`;

export function buildStructureSystemPrompt(): string {
  return `You are an AI assistant for SmallJobs — a hyperlocal community app in India.

Given a user's raw request, their follow-up answers (may be empty), intent, and known fields, return a structured thread object.

Rules:
- title: max 70 chars, specific and action-oriented — reflect the actual task
- body: 1–2 natural sentences, max 180 chars, include useful details from request + answers
- type:
  - "interest" for clubs, groups, hobby discovery, recurring social activities (run club, walk club)
  - "local" for one-off nearby physical meetups or local errands
  - "remote" ONLY for explicitly online/digital work with no physical meetup
  - Default "local" when in doubt for physical activities
- category: one of: ${CATEGORY_IDS.join(", ")}
  - walking: walks, runs, jogs, running groups
  - hangout: casual meet, coffee, hang out
  - errands: groceries, pickup, delivery
  - study: assignments, tutoring
  - chat: fandom, hobby, interest matching
- tags: 2–5 lowercase specific tags (never generic like "task", "help")
- isPaid: true ONLY if user explicitly confirmed payment in request or answers. Default false for social/walk/run/club/hangout/interest.
- amount: midpoint INR from chosen range only if isPaid is true; never invent
- urgency: "asap" | "today" | "this_week" | "flexible" — infer from request/answers/known timing
- visibility: one natural sentence about who can see/respond

Use intent and known fields even when answers array is empty.

Return ONLY valid JSON, no markdown:

{"title":"...","body":"...","type":"local","category":"walking","tags":["..."],"isPaid":false,"urgency":"flexible","visibility":"..."}`;
}

/** Client-side fallback when AI is unavailable — mirrors server sanitizer rules. */
export function getFallbackAnalyze(request: string): AnalyzeResult {
  const intent = inferIntentFromRequest(request);
  const known: Record<string, string> = {};
  if (hasTimeSignal(request)) known.timing = "stated in request";
  if (hasLocationSignal(request)) known.location = "stated in request";
  if (mentionsFree(request)) known.compensation = "free";
  if (mentionsPay(request)) known.compensation = "paid";

  const base = sanitizeAnalyzeResult(request, {
    complete: false,
    intent,
    known,
    questions: [],
  });

  if (!base.complete && base.questions.length === 0) {
    return sanitizeAnalyzeResult(request, {
      complete: false,
      intent,
      known,
      questions:
        intent === "remote_help"
          ? [
              {
                question: "Can this be done remotely?",
                options: ["Yes, fully online", "Needs to meet locally", "Either works"],
              },
            ]
          : intent === "errand_local" && !mentionsPay(request) && !mentionsFree(request)
            ? [
                {
                  question: "Will you offer anything for this?",
                  options: ["Free / community favour", "₹100–300", "₹300–600", "We can discuss"],
                },
              ]
            : [],
    });
  }

  return base;
}
