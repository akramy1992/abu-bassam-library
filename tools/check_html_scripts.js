const fs = require('fs');
const vm = require('vm');

for (const filename of process.argv.slice(2)) {
  const html = fs.readFileSync(filename, 'utf8');
  const pattern = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  let index = 0;
  while ((match = pattern.exec(html))) {
    index += 1;
    if (!match[1].trim()) continue;
    new vm.Script(match[1], { filename: `${filename}#script-${index}` });
  }
  process.stdout.write(`OK ${filename} (${index} script blocks)\n`);
}
