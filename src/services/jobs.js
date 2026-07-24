import { onValue, push, ref, remove, serverTimestamp, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'jobs';

function getLocalJobs() {
  try {
    const data = localStorage.getItem(ROOT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalJobs(jobs) {
  localStorage.setItem(ROOT, JSON.stringify(jobs));
}

const localListeners = new Set();
function notifyLocalListeners() {
  const jobs = getLocalJobs();
  jobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  localListeners.forEach((listener) => listener(jobs, null));
}

export function subscribeToJobs(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    const jobs = getLocalJobs();
    jobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(jobs, null);
    return () => {
      localListeners.delete(callback);
    };
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push({ id: child.key, ...child.val() });
      });
      rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(rows, null);
    },
    (error) => callback([], error)
  );
}

export function createJob({ title, location, type, description }) {
  const payload = { title: title.trim(), location: location.trim(), type, description: description.trim() };

  if (!isFirebaseEnabled) {
    const jobs = getLocalJobs();
    const newJob = { id: `job_${Date.now()}`, ...payload, createdAt: Date.now() };
    jobs.push(newJob);
    setLocalJobs(jobs);
    notifyLocalListeners();
    return Promise.resolve(newJob);
  }

  return push(ref(db, ROOT), { ...payload, createdAt: serverTimestamp() });
}

export function updateJob(id, { title, location, type, description }) {
  const payload = { title: title.trim(), location: location.trim(), type, description: description.trim() };

  if (!isFirebaseEnabled) {
    const jobs = getLocalJobs();
    const index = jobs.findIndex((job) => job.id === id);
    if (index === -1) return Promise.reject(new Error('Job not found.'));
    jobs[index] = { ...jobs[index], ...payload };
    setLocalJobs(jobs);
    notifyLocalListeners();
    return Promise.resolve();
  }

  return update(ref(db, `${ROOT}/${id}`), payload);
}

export function deleteJob(id) {
  if (!isFirebaseEnabled) {
    const jobs = getLocalJobs().filter((job) => job.id !== id);
    setLocalJobs(jobs);
    notifyLocalListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${id}`));
}
