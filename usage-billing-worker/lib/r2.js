// Pricing and free-tier allowances per developers.cloudflare.com/r2/pricing (standard storage).
// These change occasionally — re-check the pricing page if costs look off.
const PRICING = {
  storageGbMonth: 0.015,
  classAPerMillion: 4.5,
  classBPerMillion: 0.36,
};
const FREE_TIER = {
  storageGb: 10,
  classAOps: 1_000_000,
  classBOps: 10_000_000,
};

// developers.cloudflare.com/r2/pricing — operations billing classification.
const CLASS_A_ACTIONS = new Set([
  'ListBuckets', 'PutBucket', 'ListObjects', 'PutObject', 'CopyObject',
  'CompleteMultipartUpload', 'CreateMultipartUpload', 'LifecycleStorageTierTransition',
  'ListMultipartUploads', 'UploadPart', 'UploadPartCopy', 'ListParts',
  'PutBucketEncryption', 'PutBucketCors', 'PutBucketLifecycleConfiguration',
]);
const CLASS_B_ACTIONS = new Set([
  'HeadBucket', 'HeadObject', 'GetObject', 'UsageSummary', 'GetBucketEncryption',
  'GetBucketLocation', 'GetBucketCors', 'GetBucketLifecycleConfiguration',
]);

const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

async function queryGraphQL(env, query, variables) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors?.length) {
    const message = json.errors?.map((e) => e.message).join('; ') || response.statusText;
    throw new Error(`Cloudflare GraphQL error: ${message}`);
  }
  return json.data;
}

const QUERY = `
  query R2Usage($accountTag: string!, $bucketName: string, $start: Time!, $end: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        r2StorageAdaptiveGroups(
          limit: 1
          filter: { datetime_geq: $start, datetime_leq: $end, bucketName: $bucketName }
          orderBy: [datetime_DESC]
        ) {
          max { objectCount uploadCount payloadSize metadataSize }
        }
        r2OperationsAdaptiveGroups(
          limit: 1000
          filter: { datetime_geq: $start, datetime_leq: $end, bucketName: $bucketName }
        ) {
          sum { requests }
          dimensions { actionType }
        }
      }
    }
  }
`;

export async function getR2Usage(env, { start, end }) {
  if (!env.CLOUDFLARE_API_TOKEN) throw new Error('CLOUDFLARE_API_TOKEN not set');
  if (!env.CLOUDFLARE_ACCOUNT_ID) throw new Error('CLOUDFLARE_ACCOUNT_ID not set');

  const data = await queryGraphQL(env, QUERY, {
    accountTag: env.CLOUDFLARE_ACCOUNT_ID,
    bucketName: env.R2_BUCKET_NAME,
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const account = data.viewer.accounts[0];
  const storage = account?.r2StorageAdaptiveGroups?.[0]?.max ?? {
    objectCount: 0, uploadCount: 0, payloadSize: 0, metadataSize: 0,
  };
  const storageBytes = storage.payloadSize + storage.metadataSize;
  const storageGb = storageBytes / 1e9;

  let classAOps = 0;
  let classBOps = 0;
  const opsByAction = {};
  for (const row of account?.r2OperationsAdaptiveGroups ?? []) {
    const action = row.dimensions.actionType;
    const requests = row.sum.requests;
    opsByAction[action] = (opsByAction[action] ?? 0) + requests;
    if (CLASS_A_ACTIONS.has(action)) classAOps += requests;
    else if (CLASS_B_ACTIONS.has(action)) classBOps += requests;
  }

  const billableStorageGb = Math.max(0, storageGb - FREE_TIER.storageGb);
  const billableClassAOps = Math.max(0, classAOps - FREE_TIER.classAOps);
  const billableClassBOps = Math.max(0, classBOps - FREE_TIER.classBOps);

  const estimatedCostUsd =
    billableStorageGb * PRICING.storageGbMonth +
    (billableClassAOps / 1_000_000) * PRICING.classAPerMillion +
    (billableClassBOps / 1_000_000) * PRICING.classBPerMillion;

  return {
    bucket: env.R2_BUCKET_NAME,
    object_count: storage.objectCount,
    storage_gb: Number(storageGb.toFixed(4)),
    class_a_ops: classAOps,
    class_b_ops: classBOps,
    ops_by_action: opsByAction,
    estimated_cost_usd: Number(estimatedCostUsd.toFixed(4)),
    note: 'Storage cost is estimated from the latest snapshot in the window, not a true daily average. Free tier (10GB / 1M Class A / 10M Class B) is already subtracted.',
  };
}
