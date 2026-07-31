// Thin facade over Firebase Analytics. The rest of the app calls these
// functions instead of talking to the Firebase SDK directly, so analytics
// can be disabled, swapped, or mocked in tests without touching call sites.
import {
  logEvent as firebaseLogEvent,
  setUserId as firebaseSetUserId,
  setUserProperties as firebaseSetUserProperties,
} from 'firebase/analytics';
import { analyticsPromise } from '../firebase.js';

async function withAnalytics(run) {
  const analytics = await analyticsPromise;
  if (!analytics) return;
  run(analytics);
}

export function logAnalyticsEvent(eventName, eventParams) {
  withAnalytics((analytics) => firebaseLogEvent(analytics, eventName, eventParams));
}

export function logPageView(pagePath, pageTitle) {
  logAnalyticsEvent('page_view', { page_path: pagePath, page_title: pageTitle });
}

export function setAnalyticsUserId(userId) {
  withAnalytics((analytics) => firebaseSetUserId(analytics, userId));
}

export function setAnalyticsUserProperties(properties) {
  withAnalytics((analytics) => firebaseSetUserProperties(analytics, properties));
}
