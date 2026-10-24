// <input type="datetime-local"> works in the visitor's local time with no zone. These convert to and from the
// millisecond timestamps the articles store.
const pad = (n) => String(n).padStart(2, '0');

export function toLocalInput(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// '' or anything unparseable gives null.
export function fromLocalInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value ?? ''))) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}
