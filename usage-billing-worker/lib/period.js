// Default reporting window is the current UTC calendar month to date, since
// that lines up with how each of these services bills. Override with
// ?start=YYYY-MM-DD&end=YYYY-MM-DD for a different window.
export function resolvePeriod(url) {
  const now = new Date();
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  const start = startParam
    ? new Date(`${startParam}T00:00:00.000Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = endParam ? new Date(`${endParam}T23:59:59.999Z`) : now;

  return { start, end };
}
