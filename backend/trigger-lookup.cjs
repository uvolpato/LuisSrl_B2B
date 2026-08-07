require('dotenv').config();
const BASE = 'http://localhost:3001';

async function main() {
  const login = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@luissrl.it', password: 'LuisAdmin2026!' }),
  });
  const cookies = login.headers.get('set-cookie') ?? '';
  const { csrfToken } = await login.json();
  
  const res = await fetch(BASE + '/api/integrazione/sync-config/lookup/trigger', {
    method: 'POST',
    headers: { Cookie: cookies, 'x-csrf-token': csrfToken },
  });
  console.log('Trigger status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}
main().catch(e => console.error(e.message));
