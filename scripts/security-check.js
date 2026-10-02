'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
const html = htmlFiles.map(f => fs.readFileSync(path.join(publicDir, f), 'utf8')).join('\n');

function ok(condition, message) {
  if (!condition) throw new Error(message);
  console.log('OK  ' + message);
}

ok(!/https:\/\/unpkg\.com\/lucide/i.test(html), 'Lucide is not loaded from unpkg');
ok(pkg.dependencies?.lucide === '0.468.0', 'Lucide dependency is pinned to 0.468.0');
ok(/\/vendor\/lucide\.min\.js/.test(html), 'HTML uses the same-origin Lucide route');
ok(/function publicProfileView\(user\)/.test(server), 'Public profile allowlist view exists');
ok(!/function publicView\(u\)/.test(server), 'Legacy blacklist publicView is removed');
ok(/script-src-attr 'none'/.test(server), 'Inline event-handler JavaScript is blocked by CSP');
ok(/Content-Security-Policy', CONTENT_SECURITY_POLICY/.test(server), 'Enforced CSP header is configured');
ok(/const ext = detected\.ext;/.test(server), 'Cloud uploads use detected file extension');
ok(/sec-fetch-site/.test(server), 'Sec-Fetch-Site request hardening is present');

const actualInlineHandlers = htmlFiles.flatMap(file => {
  const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
  return source.match(/<[^>]+\son(?:click|input|change|submit|error|load|keydown|keyup|mouseover|mouseout|focus|blur)\s*=/gi) || [];
});
ok(actualInlineHandlers.length === 0, 'No inline HTML event-handler attributes need unsafe-inline');

let scriptCount = 0;
for (const file of htmlFiles) {
  const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
  const re = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(source))) {
    if (!m[1].trim()) continue;
    scriptCount++;
    crypto.createHash('sha256').update(m[1], 'utf8').digest('base64');
  }
}
ok(scriptCount > 0, `CSP can hash ${scriptCount} static inline script block(s)`);
console.log('\nSecurity static checks passed.');
