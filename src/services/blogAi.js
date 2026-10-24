import { auth } from '../firebase.js';

export class AiUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

// Asks the server for an AI draft. The caller's Firebase ID token proves they are a super user; the server
// reads the product facts itself, so only ids are sent. Resolves { draft } or throws with a readable message.
export async function requestAiDraft(payload) {
  if (!auth?.currentUser) throw new Error('Sign in again to use AI drafting.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch('/.netlify/functions/blog-ai-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 503 && data.error === 'ai_not_configured') throw new AiUnavailableError(data.message || 'AI drafting is not set up.');
  if (!response.ok) throw new Error(data.error || 'Could not generate a draft.');
  return data;
}
