// System Usability Scale scoring (Brooke, 1996).
// Usage: node testing/sus.mjs 4 2 5 1 4 2 5 1 4 2   (ten responses, each 1 to 5)
export function susScore(responses) {
  if (!Array.isArray(responses) || responses.length !== 10) throw new Error("SUS needs exactly 10 responses");
  let sum = 0;
  responses.forEach((r, i) => {
    if (!Number.isInteger(r) || r < 1 || r > 5) throw new Error(`Response ${i + 1} must be an integer from 1 to 5`);
    sum += i % 2 === 0 ? r - 1 : 5 - r; // odd-numbered items are positive, even-numbered negative
  });
  return sum * 2.5;
}

if (process.argv[1] && process.argv[1].endsWith("sus.mjs") && process.argv.length > 2) {
  console.log(susScore(process.argv.slice(2).map(Number)));
}
