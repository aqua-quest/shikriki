// Pretty-print byte ranges of a minified bundle, breaking lines outside template strings.
//   node shikriki/tools/dump-bundle.mjs <bundle.js> '[["name",start,end],...]' <out.txt>
import fs from 'node:fs';
const [,, file, rangesJson, out] = process.argv;
const buf = fs.readFileSync(file);
let res = '';
for (const [name, a, b] of JSON.parse(rangesJson)) {
  const s = buf.slice(a, b).toString('utf8');
  let o = '', inT = false, inS = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!inT && (c === '"' || c === "'") && s[i - 1] !== '\\') { inS = inS === c ? null : (inS || c); o += c; continue; }
    if (!inS && c === '`' && s[i - 1] !== '\\') { inT = !inT; o += c; continue; }
    o += c;
    if (!inT && !inS && (c === ';' || c === '{' || c === '}')) o += '\n';
  }
  res += `\n\n######## ${name} [${a}:${b}] ########\n` + o;
}
fs.writeFileSync(out, res);
console.log('wrote', out, res.length);
