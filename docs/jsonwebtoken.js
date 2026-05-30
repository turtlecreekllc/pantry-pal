/**
 * DinnerPlans.ai — Apple Sign-In Client Secret (JWT) Generator
 *
 * Generates the JWT used as the `client_secret` when exchanging Apple
 * Sign-In authorization codes at https://appleid.apple.com/auth/token.
 *
 * ------------------------------------------------------------------
 * SECURITY: The Apple AuthKey (.p8) is a long-lived private key.
 * It MUST NOT be stored in this repository or in any developer's
 * working tree. The previous version of this script read the key
 * from `docs/AuthKey_<KEY_ID>.p8` next to this file — that pattern
 * is forbidden. The `*.p8` rule in .gitignore is retained as
 * defense-in-depth, but the source of truth is the vault.
 * ------------------------------------------------------------------
 *
 * Where the key lives:
 *   1Password vault: "Turtle Creek — Dinner Plans"
 *     - Item: "Apple Sign-In AuthKey (.p8)"
 *     - Field: "private_key" (the full PEM, including BEGIN/END lines)
 *     - Field: "key_id"     (e.g. "25R6ZH5MMF")
 *     - Field: "team_id"    (e.g. "W4GNBUD8T8")
 *     - Field: "client_id"  (Services ID, e.g. "com.turtlecreekllc.dinnerplans.auth")
 *
 *   If you do not have access, request it from shane@turtlecreekllc.com.
 *
 * How to run:
 *
 *   # 1. Pull the key into your shell as env vars (1Password CLI example):
 *   export APPLE_AUTHKEY_P8="$(op read 'op://Turtle Creek — Dinner Plans/Apple Sign-In AuthKey (.p8)/private_key')"
 *   export APPLE_KEY_ID="$(op read 'op://Turtle Creek — Dinner Plans/Apple Sign-In AuthKey (.p8)/key_id')"
 *   export APPLE_TEAM_ID="$(op read 'op://Turtle Creek — Dinner Plans/Apple Sign-In AuthKey (.p8)/team_id')"
 *   export APPLE_CLIENT_ID="$(op read 'op://Turtle Creek — Dinner Plans/Apple Sign-In AuthKey (.p8)/client_id')"
 *
 *   # 2. Generate the JWT:
 *   node docs/jsonwebtoken.js
 *
 *   # 3. Unset the env vars when done:
 *   unset APPLE_AUTHKEY_P8 APPLE_KEY_ID APPLE_TEAM_ID APPLE_CLIENT_ID
 *
 * Never write the .p8 contents to disk. Never paste them into chat,
 * a ticket, a PR, or a commit. If the key is ever exposed, rotate it
 * immediately in the Apple Developer portal.
 */

const jwt = require('jsonwebtoken');

const REQUIRED_ENV = ['APPLE_AUTHKEY_P8', 'APPLE_KEY_ID', 'APPLE_TEAM_ID', 'APPLE_CLIENT_ID'];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  console.error('See the header of this file for retrieval instructions.');
  process.exit(1);
}

const privateKey = process.env.APPLE_AUTHKEY_P8;
const keyId = process.env.APPLE_KEY_ID;
const teamId = process.env.APPLE_TEAM_ID;
const clientId = process.env.APPLE_CLIENT_ID;

const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d',
  audience: 'https://appleid.apple.com',
  issuer: teamId,
  subject: clientId,
  keyid: keyId,
});

console.log(token);
