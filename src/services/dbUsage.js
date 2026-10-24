import { auth } from '../firebase.js';

// Asks the server (netlify/functions/db-usage.js) to measure the Realtime Database. Needs an admin Firebase
// sign-in; `refresh` skips the server's few-minutes cache.
export async function fetchDatabaseUsage({ refresh = false } = {}) {
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in as an admin to see database usage.');
  const token = await user.getIdToken();
  const response = await fetch(`/.netlify/functions/db-usage${refresh ? '?refresh=1' : ''}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Could not load database usage (${response.status}).`);
  return data;
}
