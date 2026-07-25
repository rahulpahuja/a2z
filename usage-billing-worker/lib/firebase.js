import { getGoogleAccessToken } from './googleAuth.js';

const MONITORING_SCOPE = 'https://www.googleapis.com/auth/monitoring.read';

// cloud.google.com/firestore/docs/monitor-usage — current (non-deprecated) metric names.
const METRICS = {
  reads: 'firestore.googleapis.com/document/read_ops_count',
  writes: 'firestore.googleapis.com/document/write_ops_count',
  deletes: 'firestore.googleapis.com/document/delete_ops_count',
};

async function sumMetric(accessToken, projectId, metricType, start, end) {
  const alignmentSeconds = Math.max(60, Math.floor((end.getTime() - start.getTime()) / 1000));
  const params = new URLSearchParams({
    filter: `metric.type="${metricType}"`,
    'interval.startTime': start.toISOString(),
    'interval.endTime': end.toISOString(),
    'aggregation.alignmentPeriod': `${alignmentSeconds}s`,
    'aggregation.perSeriesAligner': 'ALIGN_SUM',
    'aggregation.crossSeriesReducer': 'REDUCE_SUM',
  });

  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Cloud Monitoring error for ${metricType}: ${json.error?.message || response.statusText}`);
  }

  let total = 0;
  for (const series of json.timeSeries ?? []) {
    for (const point of series.points ?? []) {
      total += Number(point.value.int64Value ?? point.value.doubleValue ?? 0);
    }
  }
  return total;
}

export async function getFirebaseUsage(env, { start, end }) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  if (!env.FIREBASE_PROJECT_ID) throw new Error('FIREBASE_PROJECT_ID not set');

  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const accessToken = await getGoogleAccessToken(serviceAccount, MONITORING_SCOPE);

  const [reads, writes, deletes] = await Promise.all([
    sumMetric(accessToken, env.FIREBASE_PROJECT_ID, METRICS.reads, start, end),
    sumMetric(accessToken, env.FIREBASE_PROJECT_ID, METRICS.writes, start, end),
    sumMetric(accessToken, env.FIREBASE_PROJECT_ID, METRICS.deletes, start, end),
  ]);

  return {
    project_id: env.FIREBASE_PROJECT_ID,
    firestore_document_reads: reads,
    firestore_document_writes: writes,
    firestore_document_deletes: deletes,
    note: 'Counts are summed across all Firestore databases in the project. Cost isn’t estimated here — ask if you want Firestore pricing added.',
  };
}
