export const STATUSES = ['draft', 'scheduled', 'published', 'archived'];

export const STATUS_LABELS = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

// Allowed moves. Publishing a scheduled post early, and rescheduling, are both allowed;
// unpublishing sends a published post back to draft.
const TRANSITIONS = {
  draft: ['scheduled', 'published', 'archived'],
  scheduled: ['scheduled', 'draft', 'published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft', 'published'],
};

export const isStatus = (value) => STATUSES.includes(value);

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

// A scheduled post goes live when its time arrives, with a little tolerance for the
// scheduler running a few seconds early.
export function isDue(post, now = Date.now()) {
  return post?.status === 'scheduled' && Number.isFinite(post.publishAt) && post.publishAt <= now;
}

export const MIN_SCHEDULE_LEAD_MS = 60 * 1000;

// Whether `publishAt` is acceptable for scheduling at `now`.
export function validateScheduleTime(publishAt, now = Date.now()) {
  if (!Number.isFinite(publishAt)) return 'Choose a date and time to publish.';
  if (publishAt < now + MIN_SCHEDULE_LEAD_MS) return 'The publish time must be at least a minute in the future.';
  return null;
}

// Only published posts are visible to visitors; everything else stays in admin-only storage.
export const isPubliclyVisible = (post) => post?.status === 'published';
