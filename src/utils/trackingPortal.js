export function getTrackingPortalUrl(partner, trackingId) {
  if (!partner || !trackingId) return '';
  const p = partner.toLowerCase();
  if (p.includes('dhl')) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingId}`;
  }
  if (p.includes('fedex')) {
    return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingId}`;
  }
  if (p.includes('bluedart') || p.includes('blue dart')) {
    return `https://www.bluedart.com/maintracking.html?trackval=${trackingId}`;
  }
  if (p.includes('delhivery')) {
    return `https://www.delhivery.com/track/package/${trackingId}`;
  }
  if (p.includes('dtdc')) {
    return `https://www.dtdc.in/tracking/tracking_results.asp?pinno=${trackingId}`;
  }
  if (p.includes('india post') || p.includes('indiapost')) {
    return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  }
  return `https://www.google.com/search?q=track+package+${encodeURIComponent(partner)}+${encodeURIComponent(trackingId)}`;
}
