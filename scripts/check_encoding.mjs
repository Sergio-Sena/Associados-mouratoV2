import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        results = results.concat(walk(fullPath));
      }
    } else if (/\.(jsx?|tsx?|html|css|json|md)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk('src').concat(['index.html']);
const issues = [];

for (const file of files) {
  const buf = fs.readFileSync(file);
  const text = buf.toString('utf8');
  
  // 1. Check for UTF-8 replacement character \uFFFD (EF BF BD)
  let countFFFD = 0;
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0xEF && buf[i+1] === 0xBF && buf[i+2] === 0xBD) {
      countFFFD++;
    }
  }

  // 2. Check for UTF-8 mojibake patterns:
  // C3 followed by 80-BF (latin characters double encoded)
  // or typical mojibake characters: Ã, Â, etc.
  const lines = text.split('\n');
  const fileIssues = [];

  lines.forEach((line, lineIdx) => {
    // Mojibake patterns like Ã£, Ã§, Ã©, etc.
    if (/[\u00C2\u00C3][\u0080-\u00BF]/.test(line)) {
      fileIssues.push({ line: lineIdx + 1, content: line.trim().slice(0, 100) });
    }
  });

  if (countFFFD > 0 || fileIssues.length > 0) {
    issues.push({
      file,
      countFFFD,
      mojibakeLines: fileIssues.length,
      samples: fileIssues.slice(0, 5)
    });
  }
}

console.log(JSON.stringify(issues, null, 2));
