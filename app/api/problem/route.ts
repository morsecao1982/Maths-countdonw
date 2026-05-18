import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const FALLBACK_PROBLEMS = [
  { question: "What is the value of 3² + 4²?", answer: "25" },
  { question: "A rectangle has a perimeter of 24 cm and a length of 8 cm. What is its area in square centimeters?", answer: "32" },
  { question: "What is the least common multiple of 4 and 6?", answer: "12" },
  { question: "If 5x = 35, what is the value of x?", answer: "7" },
  { question: "What is the sum of the interior angles of a triangle?", answer: "180" },
  { question: "A bag contains 3 red, 4 blue, and 5 green marbles. What is the probability of drawing a blue marble?", answer: "1/3" },
  { question: "What is 15% of 80?", answer: "12" },
  { question: "What is the value of √144?", answer: "12" },
  { question: "If a car travels 60 miles per hour, how many miles does it travel in 2.5 hours?", answer: "150" },
  { question: "What is the area of a circle with radius 5? Express in terms of π.", answer: "25π" },
  { question: "What is the greatest common factor of 36 and 48?", answer: "12" },
  { question: "What is 2³ × 3²?", answer: "72" },
  { question: "A triangle has sides of length 5, 12, and 13. Is it a right triangle?", answer: "yes" },
  { question: "What is the median of the set {3, 7, 2, 9, 4}?", answer: "4" },
  { question: "How many diagonals does a hexagon have?", answer: "9" },
];

async function fetchAoPSProblem(): Promise<{ question: string; answer: string } | null> {
  try {
    const year = 2010 + Math.floor(Math.random() * 13);
    const url = `https://artofproblemsolving.com/wiki/index.php/${year}_MATHCOUNTS_State_Sprint_Round`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const problems: { question: string; answer: string }[] = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.match(/^\d+\./)) {
        problems.push({ question: text, answer: '' });
      }
    });

    if (problems.length > 0) {
      const pick = problems[Math.floor(Math.random() * problems.length)];
      return pick;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const aops = await fetchAoPSProblem();
  if (aops && aops.question.length > 10) {
    return NextResponse.json(aops);
  }

  const fallback = FALLBACK_PROBLEMS[Math.floor(Math.random() * FALLBACK_PROBLEMS.length)];
  return NextResponse.json({ ...fallback, source: 'fallback' });
}
