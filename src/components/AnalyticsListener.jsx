import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logPageView } from '../services/analytics.js';

export default function AnalyticsListener() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    logPageView(pathname + search, document.title);
  }, [pathname, search]);

  return null;
}
