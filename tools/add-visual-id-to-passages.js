const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "Verbal", "questions", "Question_word_passages");
const files = fs
  .readdirSync(dir)
  .filter((fileName) => /^q_\d+\.json$/i.test(fileName))
  .sort();

let updated = 0;
let already = 0;

for (const fileName of files) {
  const fullPath = path.join(dir, fileName);
  const raw = fs.readFileSync(fullPath, "utf8");

  if (raw.includes('"visual_id"')) {
    already += 1;
    continue;
  }

  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const next = raw.replace(/("id"\s*:\s*"[^"]+",\r?\n)/, `$1  "visual_id": null,${eol}`);

  if (next === raw) {
    throw new Error(`Failed to patch ${fileName}`);
  }

  fs.writeFileSync(fullPath, next, "utf8");
  updated += 1;
}

console.log(JSON.stringify({ updated, already, total: files.length }, null, 2));
