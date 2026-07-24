// Orders aren't tagged with a user id at creation time, so "my orders" is
// resolved by matching the logged-in user's phone/email/name against the
// shippingDetails recorded on each order (or a future customerId if one is
// ever added).
export function orderBelongsToUser(order, user) {
  if (!user) return false;
  const userPhoneDigits = user.phoneNumber ? user.phoneNumber.replace(/\D/g, '') : '';
  const shippingPhoneDigits = order.shippingDetails?.phone ? order.shippingDetails.phone.replace(/\D/g, '') : '';
  const phoneMatches =
    userPhoneDigits && shippingPhoneDigits &&
    (userPhoneDigits.endsWith(shippingPhoneDigits) || shippingPhoneDigits.endsWith(userPhoneDigits));

  const emailMatches = user.email && order.shippingDetails?.email?.toLowerCase() === user.email.toLowerCase();

  const nameMatches =
    user.displayName && order.shippingDetails?.firstName &&
    order.shippingDetails.firstName.toLowerCase().includes(user.displayName.split(' ')[0].toLowerCase());

  return phoneMatches || emailMatches || nameMatches || order.customerId === user.uid;
}
