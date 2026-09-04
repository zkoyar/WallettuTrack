import Papa from "papaparse";
import { fingerprint, type ImportedRow } from "@/lib/importers/shared";
import { round2 } from "@/lib/dates";

/**
 * Parser for Revolut personal-account CSV statements.
 *
 * Supports two variants:
 * 1. Full ITALIAN statement (the current app format): multiple sections such
 *    as "Conti correnti Riepiloghi" and "Estratti conto delle operazioni",
 *    with transaction rows in this format:
 *    Data,Descrizione,Categoria,"Denaro in entrata/uscita",Saldo,...
 *    es. "1 gen 2026",Trip.com,Esercente,"-35,01€","289,64€",...
 * 2. Simple ENGLISH export:
 *    Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,Balance,State
 */

export interface RevolutOptions {
  /** Skips TOPUP / "Ricarica di ..." entries, which are internal movements. */
  ignoreTopup: boolean;
  /** Skips EXCHANGE entries because currency exchanges are not expenses. */
  ignoreExchange: boolean;
  /** Skips transfers between accounts or pockets. */
  ignoreInternal: boolean;
  /** Skips automatic "Spiccioli RevPoints" savings. */
  ignoreRevPoints: boolean;
  /** Includes completed transactions only in the English variant. */
  onlyCompleted: boolean;
}

export const DEFAULT_REVOLUT_OPTIONS: RevolutOptions = {
  ignoreTopup: true,
  ignoreExchange: true,
  ignoreInternal: true,
  ignoreRevPoints: true,
  onlyCompleted: true,
};

// ---------------------------------------------------------------- dates

const ITALIAN_MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const ENGLISH_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthNumber(name: string): number | null {
  const abbreviation = name.toLowerCase().slice(0, 3);
  const idx = ITALIAN_MONTHS.indexOf(abbreviation);
  if (idx >= 0) return idx;
  // English fallback for the English-language export variant.
  return ENGLISH_MONTHS.indexOf(abbreviation);
}

/** Parses "1 gen 2026" or "15 marzo 2026" as UTC; null if unrecognized. */
function parseItalianDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\s+([A-Za-zàèéìòù]{3,})\.?\s+(\d{4})$/);
  if (!m) return null;
  const month = monthNumber(m[2]);
  if (month === null || month < 0) return null;
  return new Date(Date.UTC(+m[3], month, +m[1]));
}

/** Parses "2026-01-01 12:30" or "01 Jan 2026" as UTC; null if unrecognized. */
function parseEnglishDate(raw: string): Date | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const month = monthNumber(m[2]);
    if (month !== null && month >= 0) {
      return new Date(Date.UTC(+m[3], month, +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
    }
  }
  return null;
}

// ------------------------------------------------------------- amounts

const SYMBOL_CURRENCY: Record<string, string> = {
  "€": "EUR",
  $: "USD",
  "¥": "JPY",
  "£": "GBP",
  CHF: "CHF",
  BGN: "BGN",
  "zł": "PLN",
};

/** Parses an Italian-formatted amount such as "-1.000,00€". */
function parseEuropeanAmount(raw: string): { value: number; currency: string } | null {
  const s = raw.trim();
  if (!s) return null;
  let currency = "";
  for (const sym of Object.keys(SYMBOL_CURRENCY)) {
    if (s.includes(sym)) {
      currency = SYMBOL_CURRENCY[sym];
      break;
    }
  }
  const cleaned = s
    .replace(/€|\$|¥|£|CHF|BGN|zł/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? { value, currency } : null;
}

/** Parses an English-formatted amount such as "-45.30". */
function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[\s\u2212]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ------------------------------------------------------------ detection

const RE_ITALIAN_HEADER = /\bData\s*,\s*"?Descrizione"?\s*,\s*"?Categoria/i;

/** Detects whether the file is any supported Revolut statement variant. */
export function isRevolutCsv(text: string): boolean {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const h = firstLine.split(",").map((x) => x.replace(/^"|"$/g, "").trim().toLowerCase());
  const has = (name: string) => h.includes(name);
  return (
    RE_ITALIAN_HEADER.test(text) ||
    has("started date") ||
    (has("type") && has("product")) ||
    (has("completed date") && has("state"))
  );
}

// ------------------------------------------------- category rules

interface Rule {
  pattern: RegExp;
  category: string;
}

const CATEGORY_RULES: Rule[] = [
  { pattern: /supermercato|esselunga|lidl|aldi|\bcoop\b|conad|carrefour|eurospin|penny\b|\bmd\b|famila|crai|bennet|iperal|tigros|\bpam\b|billa|despar|\bspar\b|\balì\b|grocery|supermarket|il mio market|alimentari|howlader|żabka|lawson|7-eleven/i, category: "Groceries" },
  { pattern: /ristorante|pizzeria|\bbar\b|caff[eè]|coffee|mcdonald|mc ?donald|burger|sushi|kebab|glovo|just ?eat|deliveroo|thefork|trattoria|osteria|pizza\b|starbucks|autogrill|old wild west|roadhouse|kfc\b|\bkfc/i, category: "Dining" },
  { pattern: /uber|\bdidi\b|alp\*didi|freenow|taxi|easy ?park|ecoparking|parking|parcheggio|trenitalia|trenord|\bitalo\b|flixbus|\batac\b|\bamt\b|azienda metropolitana.*trasporti|azienda\s+trasporti|\bamts\b|trasporti e sosta|benzina|\beni\b|\bq8\b|tamoil|\besso\b|\bshell\b|petrol company|stazione di servizio|\bfuel\b|autostrada|telepass|kiwi\.com|trip\.com|ryanair|easyjet|wizz air|volotea|ita airways|alitalia|booking\.com|airbnb|expedia|lastminute|\bhotel\b|hostel|bounce/i, category: "Transport and travel" },
  { pattern: /farmacia|pharmacy|parafarmacia|dentista|dottore?|ospedale|clinic[aà]|sanita|qc terme/i, category: "Health" },
  { pattern: /netflix|spotify|prime video|amazon prime|disney\+?|hbo|now ?tv|\bdazn\b|apple\.com|play\.google|icloud|microsoft 365|xbox|playstation plus|youtube premium|abbonamento|subscription|openai|chatgpt|anthropic|claude|github|notion|figma|canva|iliad|vodafone|windtre|\btim\b|ho\.mobile|very mobile|holafly/i, category: "Subscriptions" },
  { pattern: /cinema|uci cinemas|teatro|concerto|\bsteam\b|playstation store|nintendo|epic games|gamivo|eneba|yuplay|simkl|jokerebig|libreria|mondadori|feltrinelli|bowling|museo|muzeum|parco|pop mart|vivaticket|bigliett|lido\b|palestra|fitactive|gympass/i, category: "Entertainment" },
  { pattern: /affitto|\brent\b|condominio|riscaldamento|condominiale|\benel\b|\bhera\b|\bacea\b|edison|\biren\b|\ba2a\b|bolletta|gas domestico|luce e gas|\bikea\b/i, category: "Housing and rent" },
  { pattern: /\bzara\b|h&m|decathlon|intrend|yoox|zalando|shein|calzedonia|intimissimi|tezenis|kiabi|primark|temu\b|wan kee|flower kickz|sofadal/i, category: "Clothing" },
  { pattern: /universit|scuola|\budemy\b|coursera|masterclass|corso online|laboratorio di via/i, category: "Education" },
  { pattern: /stipendio|salary|payroll|compenso|gofundme/i, category: "Other income" },
];

export function guessCategory(description: string): string | null {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) return rule.category;
  }
  return null;
}

// ------------------------------------------------------ internal movements

const RE_INTERNAL = /^prelievo da pocket|^accredita\s+[a-z]{3}\s+.+\s+da\s+[a-z]{3}/i;
const RE_REVPOINTS = /^spiccioli revpoints/i;
const RE_TOPUP_DESC = /^ricarica di \*/i;

// ------------------------------------------------------------- parsing

export interface RevolutParseResult {
  rows: ImportedRow[];
  errors: { row: number; message: string }[];
  stats: Record<string, number>;
}

function emptyStats(): Record<string, number> {
  return {
    pendingSkipped: 0,
    topupSkipped: 0,
    exchangeSkipped: 0,
    internalSkipped: 0,
    revPointsSkipped: 0,
    otherSkipped: 0,
  };
}

function bump(stats: Record<string, number>, key: string) {
  stats[key] = (stats[key] ?? 0) + 1;
}

/**
 * ITALIAN variant: a full statement containing multiple sections.
 * Scans every row and treats it as a transaction when the first cell is an
 * Italian date and the fourth is an amount with a currency symbol.
 */
function parseItalianStatement(text: string, options: RevolutOptions): RevolutParseResult {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    header: false,
    skipEmptyLines: "greedy",
  });

  const result: RevolutParseResult = { rows: [], errors: [], stats: emptyStats() };

  (parsed.data as string[][]).forEach((cells) => {
    if (!cells || cells.length < 4) return;

    const dateRaw = (cells[0] ?? "").trim();
    const description = (cells[1] ?? "").trim();
    const category = (cells[2] ?? "").trim();
    const amountRaw = (cells[3] ?? "").trim();
    const balanceRaw = (cells[4] ?? "").trim();

    if (/^totale$/i.test(dateRaw)) return;

    const when = parseItalianDate(dateRaw);
    if (!when) return; // Summary or header rows.

    const amt = parseEuropeanAmount(amountRaw);
    if (!amt || amt.value === 0) {
      bump(result.stats, "otherSkipped");
      return;
    }

    // Optional filters for internal movements.
    if (options.ignoreInternal && RE_INTERNAL.test(description)) {
      bump(result.stats, "internalSkipped");
      return;
    }
    if (options.ignoreRevPoints && RE_REVPOINTS.test(description)) {
      bump(result.stats, "revPointsSkipped");
      return;
    }
    const isTopup =
      options.ignoreTopup &&
      (category.toLowerCase() === "ricarica" || RE_TOPUP_DESC.test(description));
    if (isTopup) {
      bump(result.stats, "topupSkipped");
      return;
    }

    const currency = amt.currency || "EUR";

    // Optional fee in the Italian "Costi" column at index 7.
    const feeParsed = parseEuropeanAmount((cells[7] ?? "").trim());
    const fee = feeParsed ? Math.abs(feeParsed.value) : 0;

    // A fee always reduces the net result.
    const signed = round2(amt.value - fee);
    if (signed === 0) {
      bump(result.stats, "otherSkipped");
      return;
    }

    result.rows.push({
      externalId: fingerprint([
        "revolut-it",
        when.toISOString(),
        signed.toFixed(2),
        currency,
        description,
        balanceRaw,
      ]),
      type: signed > 0 ? "INCOME" : "EXPENSE",
      amount: round2(Math.abs(signed)),
      currency,
      date: when,
      description: description || null,
      notes: category ? `Revolut · ${category}` : "Revolut",
      categoryName: guessCategory(description),
    });
  });

  return result;
}

/**
 * ENGLISH variant: a simple per-period export with a State column.
 */
function parseEnglishExport(text: string, options: RevolutOptions): RevolutParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const result: RevolutParseResult = { rows: [], errors: [], stats: emptyStats() };

  parsed.data.forEach((rawRow, i) => {
    const lineNo = i + 2;
    const get = (...names: string[]): string => {
      for (const n of names) {
        const v = rawRow[n];
        if (v !== undefined && v !== "") return v;
      }
      return "";
    };

    const type = (get("type") || "").trim().toUpperCase();
    const startedRaw = get("started date", "date");
    const completedRaw = get("completed date");
    const description = (get("description") || "").trim();
    const amount = parseAmount(get("amount"));
    const fee = parseAmount(get("fee")) ?? 0;
    let currency = get("currency").trim().toUpperCase();
    const state = (get("state") || "").trim().toUpperCase();
    const product = (get("product") || "").trim();

    if (!startedRaw && !completedRaw) {
      bump(result.stats, "otherSkipped");
      return;
    }
    if (options.onlyCompleted && !["COMPLETED", "ACTIVE"].includes(state)) {
      bump(result.stats, "pendingSkipped");
      return;
    }
    if (options.ignoreExchange && type === "EXCHANGE") {
      bump(result.stats, "exchangeSkipped");
      return;
    }
    if (options.ignoreTopup && type === "TOPUP") {
      bump(result.stats, "topupSkipped");
      return;
    }
    if (options.ignoreInternal && /^to pocket|^from pocket/i.test(description)) {
      bump(result.stats, "internalSkipped");
      return;
    }
    if (!type) {
      bump(result.stats, "otherSkipped");
      return;
    }

    if (amount === null || amount === 0) {
      result.errors.push({ row: lineNo, message: `Invalid amount: "${amount}"` });
      return;
    }

    const signedTotal = round2(amount - Math.max(0, fee));
    if (signedTotal === 0) {
      bump(result.stats, "otherSkipped");
      return;
    }

    const when = parseEnglishDate(completedRaw || startedRaw);
    if (!when || Number.isNaN(when.getTime())) {
      result.errors.push({
        row: lineNo,
        message: `Unrecognized date: "${completedRaw || startedRaw}"`,
      });
      return;
    }

  // Revolut leaves currency blank in some exports; assume EUR.
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    result.errors.push({ row: lineNo, message: `Invalid currency: "${currency}"` });
    return;
  }
  if (!currency) currency = "EUR";

    const notesParts = [type, product].filter(Boolean).join(" · ");

    result.rows.push({
      externalId: fingerprint([
        "revolut",
        when.toISOString(),
        signedTotal.toFixed(2),
        currency,
        type,
        description,
      ]),
      type: signedTotal > 0 ? "INCOME" : "EXPENSE",
      amount: round2(Math.abs(signedTotal)),
      currency,
      date: when,
      description: description || null,
      notes: notesParts || null,
      categoryName: guessCategory(description),
    });
  });

  return result;
}

export function parseRevolutCsv(text: string, options: RevolutOptions): RevolutParseResult {
  // Italian format: the transaction header appears somewhere in the file.
  if (RE_ITALIAN_HEADER.test(text)) {
    return parseItalianStatement(text, options);
  }
  return parseEnglishExport(text, options);
}
