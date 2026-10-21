/**
 * Bilingual safety matching — English and Arabic.
 *
 * Pure, dependency-free, and shared by the client and the server. `server/ai.ts`
 * re-exports `detectRisk` from here so there is exactly one implementation of the
 * guard set; the revenue domain imports the same predicates.
 *
 * Why this is not a plain regex file:
 *
 * 1. JavaScript's `\b` is ASCII-only. It never fires next to an Arabic letter, so
 *    `/\b(توقف)\b/.test("توقف عن مراسلتي")` is `false`. Every Arabic pattern
 *    therefore uses an explicit non-letter boundary — `(^|[^\p{L}])…($|[^\p{L}])`
 *    with the `u` flag and `\p{L}` (not `\w`, which is ASCII-only too).
 *
 * 2. Arabic orthography varies for the same word: `إلغاء` / `الغاء` / `ٱلغاء`,
 *    and a message may carry harakat, tatweel, or bidi controls. Text is normalized
 *    before matching so orthographic variance does not defeat a pattern.
 *
 * 3. Arabic attaches proclitics (و / ف / ب) and the definite article (ال) to the
 *    word. `بالم` + `ألم` is `بألم`, so the boundary helper allows an optional
 *    proclitic and an optional `ال`.
 *
 * Known limit: Arabic dialect and transliterated Arabic ("la tab3ath liya
 * rasayel") are NOT covered. A false negative here means an opt-out is not
 * detected. Widen the tables below, and re-run `server/tests/safety.test.ts`,
 * which pins the benign phrases that must not match.
 */

/** Strip orthographic noise and fold the letter variants that carry no meaning for matching. */
export function normalizeText(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, "") // harakat / tanwin
    .replace(/ـ/g, "") // tatweel
    .replace(/[‌‍‎‏‪-‮⁦-⁩]/g, "") // ZWNJ/ZWJ + bidi controls
    .replace(/[أإآٱ]/g, "ا") // alef variants -> ا
    .replace(/ى/g, "ي") // alef maqsura -> ي
    .replace(/ة/g, "ه") // ta marbuta -> ه
    .toLowerCase();
}

/**
 * An Arabic word: optional proclitic (و/ف/ب), optional article (ال), then the
 * body, bounded by non-letters on both sides.
 *
 * The body is normalized too, because the text is: a pattern written `شكوى` would
 * never match text normalized to `شكاي` (the `ى` → `ي` fold).
 */
const ar = (body: string) =>
  new RegExp(
    String.raw`(^|[^\p{L}])(?:[وفب])?(?:ال)?${normalizeText(body)}(?:$|[^\p{L}])`,
    "u",
  );

/**
 * An Arabic phrase: optional proclitic, then the body, bounded on the left only.
 * Used where the phrase can continue with a suffix (`توقف عن مراسلتي`).
 */
const arPhrase = (body: string) =>
  new RegExp(
    String.raw`(^|[^\p{L}])(?:[وفب])?${normalizeText(body)}`,
    "u",
  );

/** An English pattern. `\b` is fine here — the Latin alphabet is ASCII. */
const re = (body: string) => new RegExp(body, "i");

export const spamPatterns: RegExp[] = [
  re(String.raw`buy\s+\d+\s+followers|crypto\s+giveaway|click.*win.*prize`),
  arPhrase(String.raw`اشتر \d*\s*متابع`),
  ar("جائزه"),
  arPhrase("اضغط.*واربح"),
];

export const injectionPatterns: RegExp[] = [
  re(
    "ignore (all |previous |your )?instructions|system prompt|developer message|reveal.*(secret|token|password)|bypass.*(rule|policy)",
  ),
  arPhrase("تجاهل (كل )?التعليمات"),
  arPhrase("تعليمات النظام"),
  arPhrase("(اهرب|تجاهل|خرق|غير).{0,12}تعليماتك"),
  arPhrase("تجاوز (القواعد|السياسات)"),
  arPhrase("كسر القواعد"),
  ar("بدون قيود"),
  arPhrase("اعطني كلمه (المرور|السر)"),
  arPhrase("اظهر لي (تعليمات|كل التعليمات)"),
];

export const secretPatterns: RegExp[] = [
  re("password|credit card|medical records"),
  arPhrase("كلمه (المرور|السر)"),
  arPhrase("بطاقه (ائتمان|الائتمان)"),
  arPhrase("السجلات الطبيه"),
];

export const refundPatterns: RegExp[] = [
  re("refund|chargeback|legal action|cancel my"),
  arPhrase("استرداد (المبلغ|الاموال)"),
  ar("استرداد"),
  ar("ارجاع المبلغ"),
  ar("شيك ارجاع"),
  ar("اجراء قانوني"),
  ar("شكوى"),
  ar("الغاء طلبي"),
];

export const optOutPatterns: RegExp[] = [
  re("unsubscribe|stop messaging|do not contact|don't contact|no more messages"),
  arPhrase(
    "توقف عن (المراسله|مراسله|مراسلتني|مراسلتي|الرسائل|التواصل|الكلام)",
  ),
  arPhrase("لا ترسل لي (رسائل|المزيد)"),
  arPhrase("لا تريد (رسائل|اي رسائل|ان اوصلك)"),
  ar("الغي الاشتراك"),
  ar("الغاء الاشتراك"),
  ar("ايقاف الرسائل"),
  ar("وقف المراسلات"),
  ar("امسحني"),
  ar("احذفني"),
];

export const clinicalPatterns: RegExp[] = [
  re(
    "symptom|pain|chest pain|medicat|diagnos|treat|pregnan|emergency|bleeding|suicid|medical advice",
  ),
  ar("الم"),
  ar("وجع"),
  ar("اعراض"),
  ar("تشخيص"),
  ar("علاج"),
  ar("دواء"),
  ar("حامل"),
  ar("طارئ"),
  ar("نزيف"),
  ar("انتحار"),
  ar("منتحر"),
  ar("نصيحه طبيه"),
];

const matches = (patterns: RegExp[], text: string) => {
  const normalized = normalizeText(text);
  return patterns.some((pattern) => pattern.test(normalized));
};

export const isSpam = (text: string) => matches(spamPatterns, text);
export const isInjection = (text: string) => matches(injectionPatterns, text);
export const isSecret = (text: string) => matches(secretPatterns, text);
export const isRefund = (text: string) => matches(refundPatterns, text);
export const isOptOut = (text: string) => matches(optOutPatterns, text);
export const isClinical = (text: string) => matches(clinicalPatterns, text);

/** Injection or secret request — the reply must never comply. */
export const isUnsafe = (text: string) => isInjection(text) || isSecret(text);

/** Refund or clinical content — a human must handle it. */
export const isSensitive = (text: string) => isRefund(text) || isClinical(text);

export type RiskKind = "spam" | "sensitive" | "injection" | null;

/**
 * The risk classification used by the AI guard. The order matters: spam and
 * injection are the more specific verdicts and win over the general
 * "sensitive" bucket.
 */
export function detectRisk(text: string): RiskKind {
  if (isSpam(text)) return "spam";
  if (isInjection(text)) return "injection";
  if (isRefund(text) || isSecret(text) || isClinical(text) || isOptOut(text))
    return "sensitive";
  return null;
}
