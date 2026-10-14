// Customer Firebase uids are minted by netlify/functions/exchange-token.js as
// `c_` + 32 base64url characters (a keyed hash of the verified phone number).
const CUSTOMER_UID_PATTERN = /^c_[A-Za-z0-9_-]{32}$/;

export const isCustomerUid = (uid) => typeof uid === 'string' && CUSTOMER_UID_PATTERN.test(uid);
