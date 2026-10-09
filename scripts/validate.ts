import { checkRepo } from "./lib/integrity.ts";

const { days, scans, errors } = checkRepo();
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`- ${e}\n`);
  process.exit(1);
}
console.log(`✓ ${days.length} days valid, ${scans.length} scan logs`);
