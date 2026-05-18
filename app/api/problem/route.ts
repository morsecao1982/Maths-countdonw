import { NextRequest, NextResponse } from 'next/server';

const PROBLEMS = [
  { question: "What is the value of 3² + 4²?", answer: "25" },
  { question: "A rectangle has a perimeter of 24 cm and a length of 8 cm. What is its area in square centimeters?", answer: "32" },
  { question: "What is the least common multiple of 4 and 6?", answer: "12" },
  { question: "If 5x = 35, what is the value of x?", answer: "7" },
  { question: "What is the sum of the interior angles of a triangle in degrees?", answer: "180" },
  { question: "A bag contains 3 red, 4 blue, and 5 green marbles. What is the probability of drawing a blue marble? Express as a fraction.", answer: "1/3" },
  { question: "What is 15% of 80?", answer: "12" },
  { question: "What is the value of √144?", answer: "12" },
  { question: "If a car travels 60 miles per hour, how many miles does it travel in 2.5 hours?", answer: "150" },
  { question: "What is the area of a circle with radius 5? Express in terms of π.", answer: "25π" },
  { question: "What is the greatest common factor of 36 and 48?", answer: "12" },
  { question: "What is 2³ × 3²?", answer: "72" },
  { question: "What is the median of the set {3, 7, 2, 9, 4}?", answer: "4" },
  { question: "How many diagonals does a hexagon have?", answer: "9" },
  { question: "What is the value of 7! ÷ 5!?", answer: "42" },
  { question: "A square has an area of 64 square units. What is its perimeter?", answer: "32" },
  { question: "What is the sum of the first 10 positive integers?", answer: "55" },
  { question: "If 3x + 7 = 22, what is the value of x?", answer: "5" },
  { question: "What is the volume of a cube with side length 4?", answer: "64" },
  { question: "What is 0.375 expressed as a fraction in simplest form?", answer: "3/8" },
  { question: "How many prime numbers are there between 1 and 20?", answer: "8" },
  { question: "What is the slope of the line passing through (1, 2) and (3, 8)?", answer: "3" },
  { question: "A triangle has angles of 45° and 75°. What is the third angle in degrees?", answer: "60" },
  { question: "What is the value of 4² + 3³?", answer: "43" },
  { question: "If a dozen eggs costs $3.60, how much does one egg cost in cents?", answer: "30" },
  { question: "What is the perimeter of a regular pentagon with side length 7?", answer: "35" },
  { question: "What is the value of (2 + 3) × (4 − 1)?", answer: "15" },
  { question: "How many degrees are in a right angle?", answer: "90" },
  { question: "What is the LCM of 8 and 12?", answer: "24" },
  { question: "A train travels 180 miles in 3 hours. What is its average speed in mph?", answer: "60" },
  { question: "What is the value of √(16 + 9)?", answer: "5" },
  { question: "What is 1/4 + 1/3? Express as a fraction.", answer: "7/12" },
  { question: "If a rectangle has length 9 and width 4, what is the length of its diagonal?", answer: "√97" },
  { question: "How many faces does a cube have?", answer: "6" },
  { question: "What is 20% of 150?", answer: "30" },
  { question: "What is the value of 5² − 3²?", answer: "16" },
  { question: "What is the next prime number after 13?", answer: "17" },
  { question: "A circle has circumference 10π. What is its radius?", answer: "5" },
  { question: "What is the sum of interior angles of a quadrilateral in degrees?", answer: "360" },
  { question: "If x/4 = 12, what is x?", answer: "48" },
  { question: "What is the mean of 4, 8, 15, 16, 23, 42?", answer: "18" },
  { question: "How many seconds are in 2.5 minutes?", answer: "150" },
  { question: "What is 3/5 of 75?", answer: "45" },
  { question: "What is the value of 2⁸?", answer: "256" },
  { question: "A cylinder has radius 3 and height 5. What is its volume in terms of π?", answer: "45π" },
  { question: "What is the largest two-digit prime number?", answer: "97" },
  { question: "If 2x − 3 = 11, what is x?", answer: "7" },
  { question: "What is the ratio of the circumference of a circle to its diameter?", answer: "π" },
  { question: "A right triangle has legs of length 6 and 8. What is the hypotenuse?", answer: "10" },
  { question: "What is 125 expressed as a power of 5?", answer: "5³" },
];

export async function GET(req: NextRequest) {
  const used = req.nextUrl.searchParams.get('used')?.split(',').filter(Boolean) ?? [];
  const available = PROBLEMS.filter(p => !used.includes(p.question));
  const pool = available.length > 0 ? available : PROBLEMS;
  const problem = pool[Math.floor(Math.random() * pool.length)];
  return NextResponse.json(problem);
}
