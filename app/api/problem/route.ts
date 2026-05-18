import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface Problem { question: string; answer: string; source?: string; }

// Module-level cache: key = "YYYYv" (e.g. "2023A"), value = fetched problems
const cache: Map<string, { problems: Problem[]; fetchedAt: number }> =
  (globalThis as any).__probCache ?? ((globalThis as any).__probCache = new Map());
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const FALLBACK: Problem[] = [
  { question: "What is the value of $3^2 + 4^2$?", answer: "25" },
  { question: "A rectangle has perimeter $24$ cm and length $8$ cm. What is its area in square centimeters?", answer: "32" },
  { question: "What is the least common multiple of $4$ and $6$?", answer: "12" },
  { question: "If $5x = 35$, what is $x$?", answer: "7" },
  { question: "What is the sum of the interior angles of a triangle in degrees?", answer: "180" },
  { question: "A bag has $3$ red, $4$ blue, and $5$ green marbles. What is the probability of drawing blue? Express as a fraction.", answer: "1/3" },
  { question: "What is $15\\%$ of $80$?", answer: "12" },
  { question: "What is $\\sqrt{144}$?", answer: "12" },
  { question: "A car travels $60$ mph. How many miles in $2.5$ hours?", answer: "150" },
  { question: "What is the area of a circle with radius $5$? Express in terms of $\\pi$.", answer: "25\\pi" },
  { question: "What is the GCF of $36$ and $48$?", answer: "12" },
  { question: "What is $2^3 \\times 3^2$?", answer: "72" },
  { question: "What is the median of $\\{3, 7, 2, 9, 4\\}$?", answer: "4" },
  { question: "How many diagonals does a hexagon have?", answer: "9" },
  { question: "What is the value of $7! \\div 5!$?", answer: "42" },
  { question: "A square has area $64$ sq units. What is its perimeter?", answer: "32" },
  { question: "What is the sum of the first $10$ positive integers?", answer: "55" },
  { question: "If $3x + 7 = 22$, what is $x$?", answer: "5" },
  { question: "What is the volume of a cube with side length $4$?", answer: "64" },
  { question: "Express $0.375$ as a fraction in simplest form.", answer: "3/8" },
  { question: "How many primes are between $1$ and $20$?", answer: "8" },
  { question: "What is the slope through $(1,2)$ and $(3,8)$?", answer: "3" },
  { question: "A right triangle has legs $6$ and $8$. What is the hypotenuse?", answer: "10" },
  { question: "What is $\\sqrt{16+9}$?", answer: "5" },
  { question: "What is $\\frac{1}{4} + \\frac{1}{3}$? Express as a fraction.", answer: "7/12" },
  { question: "What is $20\\%$ of $150$?", answer: "30" },
  { question: "A circle has circumference $10\\pi$. What is its radius?", answer: "5" },
  { question: "What is the largest two-digit prime?", answer: "97" },
  { question: "If $2x - 3 = 11$, what is $x$?", answer: "7" },
  { question: "A cylinder has radius $3$ and height $5$. What is its volume in terms of $\\pi$?", answer: "45\\pi" },
];

function extractLatex(el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
  // Replace math spans with $latex$ before extracting text
  $(el).find('.mwe-math-element').each((_, mathEl) => {
    const img = $(mathEl).find('img').first();
    const alt = img.attr('alt') ?? '';
    if (alt) {
      const isDisplay = img.hasClass('mwe-math-fallback-image-display');
      $(mathEl).replaceWith(isDisplay ? ` $$${alt}$$ ` : ` $${alt}$ `);
    }
  });
  // Also handle plain <math> annotation tags
  $(el).find('math').each((_, mathEl) => {
    const ann = $(mathEl).find('annotation[encoding="application/x-tex"]').text().trim();
    if (ann) $(mathEl).replaceWith(` $${ann}$ `);
  });
  return $(el).text().replace(/\s+/g, ' ').trim();
}

async function fetchAMC10(year: number, ver: 'A' | 'B'): Promise<Problem[] | null> {
  const key = `${year}${ver}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.problems;

  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; MathBuzzer/1.0)' };
  const signal  = AbortSignal.timeout(8000);

  const [probRes, ansRes] = await Promise.all([
    fetch(`https://artofproblemsolving.com/wiki/index.php/${year}_AMC_10${ver}_Problems`, { headers, signal }),
    fetch(`https://artofproblemsolving.com/wiki/index.php/${year}_AMC_10${ver}_Answer_Key`, { headers, signal: AbortSignal.timeout(5000) }),
  ]);

  if (!probRes.ok) return null;

  const $ = cheerio.load(await probRes.text());

  // Parse answer key
  const answers: string[] = [];
  if (ansRes.ok) {
    const $a = cheerio.load(await ansRes.text());
    // Try ordered list items
    $a('#mw-content-text ol li').each((i, el) => {
      const t = $a(el).text().trim();
      const m = t.match(/^([A-E])/);
      if (m) answers.push(m[1]);
    });
    // Fallback: scan for "N. X" patterns
    if (answers.length < 10) {
      const txt = $a('#mw-content-text').text();
      for (const m of txt.matchAll(/\b(\d{1,2})\.\s*([A-E])\b/g)) {
        const n = parseInt(m[1]);
        if (n >= 1 && n <= 30) answers[n - 1] = m[2];
      }
    }
  }

  const problems: Problem[] = [];

  // Walk headline spans looking for "Problem N"
  $('span.mw-headline').each((_, el) => {
    const label = $(el).text().trim();
    const match = label.match(/^Problem (\d+)$/);
    if (!match) return;
    const num = parseInt(match[1]);
    if (num < 1 || num > 10) return;

    const h2 = $(el).closest('h2');
    const parts: string[] = [];
    let sib = h2.next();
    while (sib.length && !sib.is('h2')) {
      if (sib.is('p, ul, ol, div')) {
        const t = extractLatex(sib, $);
        if (t) parts.push(t);
      }
      sib = sib.next();
    }

    const question = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (question.length > 30) {
      problems.push({
        question: `[AMC 10${ver} ${year} #${num}] ${question}`,
        answer: answers[num - 1] ?? '',
        source: 'aops',
      });
    }
  });

  if (problems.length >= 5) {
    cache.set(key, { problems, fetchedAt: Date.now() });
    return problems;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const usedParam = req.nextUrl.searchParams.get('used') ?? '';
  const used = usedParam.split(',').filter(Boolean);

  // Try AoPS AMC 10 — pick a random recent year/version
  try {
    const years = [2023, 2022, 2021, 2019, 2018, 2017];
    const vers: ('A' | 'B')[] = ['A', 'B'];
    const year = years[Math.floor(Math.random() * years.length)];
    const ver  = vers[Math.floor(Math.random() * vers.length)];

    const aopsProblems = await fetchAMC10(year, ver);
    if (aopsProblems && aopsProblems.length > 0) {
      const available = aopsProblems.filter(p => !used.includes(p.question));
      const pool = available.length > 0 ? available : aopsProblems;
      return NextResponse.json(pool[Math.floor(Math.random() * pool.length)]);
    }
  } catch {
    // fall through to fallback
  }

  const available = FALLBACK.filter(p => !used.includes(p.question));
  const pool = available.length > 0 ? available : FALLBACK;
  return NextResponse.json({ ...pool[Math.floor(Math.random() * pool.length)], source: 'fallback' });
}
