#!/usr/bin/env node
/**
 * Does Gloo actually answer?
 *
 * The unit tests never touch the network, so nothing in the suite can tell you
 * whether the credentials in .env are real. This does one exchange and one tiny
 * completion, and says which step failed if either does.
 *
 * It prints no secret. On failure it reports the status code and the first line
 * of the body, which is enough to tell a wrong secret from a wrong scope from a
 * plan that has run out of credit.
 *
 *   node scripts/check-gloo.mjs
 */

import { readFileSync } from 'node:fs';

function readEnv() {
  let raw = '';
  try {
    raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  } catch {
    return {};
  }
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) out[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnv(), ...process.env };
const id = env.GLOO_CLIENT_ID ?? '';
const secret = env.GLOO_CLIENT_SECRET ?? '';

const fail = (message) => {
  console.error(`\n  FAIL  ${message}\n`);
  process.exit(1);
};

if (!id || !secret) {
  fail(
    'GLOO_CLIENT_ID / GLOO_CLIENT_SECRET missing from .env\n' +
    '        Copy the names from .env.example and paste the values from\n' +
    '        Gloo AI Studio -> API Credentials.',
  );
}

console.log(`\n  client id  ${id.slice(0, 4)}${'*'.repeat(Math.max(0, id.length - 4))}`);
console.log(`  secret     ${secret.length} characters, not shown`);

// 1. the exchange
console.log('\n  1/2  exchanging credentials for a token...');
const tokenResponse = await fetch('https://platform.ai.gloo.com/oauth2/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials&scope=api/access',
});

if (!tokenResponse.ok) {
  const body = (await tokenResponse.text()).slice(0, 300);
  fail(
    `token endpoint returned ${tokenResponse.status}\n        ${body}\n\n` +
    '        401 here almost always means the secret is wrong or was regenerated.',
  );
}

const { access_token: token, expires_in: expiresIn } = await tokenResponse.json();
if (!token) fail('token endpoint returned 200 with no access_token');
console.log(`       ok — token valid for ${expiresIn}s`);

// 2. one real completion
console.log('  2/2  asking for one line...');
const completion = await fetch('https://platform.ai.gloo.com/ai/v2/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'Réponds en un seul mot.' },
      { role: 'user', content: 'Dis: bonjour' },
    ],
    auto_routing: true,
    max_tokens: 16,
  }),
});

if (!completion.ok) {
  const body = (await completion.text()).slice(0, 300);
  fail(`completions returned ${completion.status}\n        ${body}`);
}

const payload = await completion.json();
const line = payload?.choices?.[0]?.message?.content;
if (!line) fail(`completions returned 200 with no content:\n        ${JSON.stringify(payload).slice(0, 300)}`);

console.log(`       ok — model ${payload.model ?? 'unknown'} said: ${line.trim()}`);
console.log('\n  PASS  Gloo is reachable and the credentials work.\n');
