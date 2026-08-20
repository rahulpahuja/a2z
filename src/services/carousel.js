import { onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const PATH = 'settings/carousel';

export const DEFAULT_CAROUSEL_SLIDES = [
  {
    id: 'slide_1',
    title: 'The Festive Collection',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAi6nWtvfZJXTG4DXcMDNhCLHVdrK6vyhvOVsebD_THMBWJzQBfmneLZtM8xa-cso39eALmfuN97ofl_1zApobtY6XemRxNe0cn-ShqNrIELjxrqksxYN5AdUJfpVNEGY6ZAP3CuK2b3-yuMMDnyWaarDjLJ3fFdIexM86YhJhVkM0Zjl_jecY40qOjOJreeJbF4iGNPe6cLlalbtGW9bCoEAlb2oaqPbd4muawrbsZyh7Lo9aqaS6muQ',
    alt: 'A stunning, high-fashion editorial photograph of a South Asian woman wearing an intricately embroidered, vibrant Hot Pink and gold Saree.',
    cta: 'Shop Now',
    link: '/products',
  },
  {
    id: 'slide_3',
    title: 'Contemporary Luxury Coords',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGeEDQ9fsFvJl2R1sCNwJ9yZ_csqnlzRo6BUr-0UQv_sIOvILMQLjnhDLoRtWkmd5Jh07aZ2yk1IOYUhs5mO0elyMGF2KVzF_knqXKbyTJS4LoDLvCnoaYyQbcVvaQ44eJmurH6w5WK3_UODg-AhFU5z_Jlyp2hy6NeSPwLj7K14xOD1bikOxybrQ-W5rXfvCqNEFtr7nWPxMmVGAtP8eiOxRuR64VuGO7HOu8VOvU8Z3ognrTGtPAxw',
    alt: 'A contemporary Coord set featuring a tunic and wide-leg trousers in a soft Dusty Rose with subtle, traditional block-print patterns.',
    cta: 'Discover Coords',
    link: '/products?category=Coord Set',
  }
];

function getLocalCarousel() {
  try {
    const data = localStorage.getItem(PATH);
    return data ? JSON.parse(data) : DEFAULT_CAROUSEL_SLIDES;
  } catch {
    return DEFAULT_CAROUSEL_SLIDES;
  }
}

function setLocalCarousel(slides) {
  localStorage.setItem(PATH, JSON.stringify(slides));
}

const listeners = new Set();
function notifyListeners() {
  const data = getLocalCarousel();
  listeners.forEach((listener) => listener(data, null));
}

export function subscribeToCarousel(callback) {
  if (!isFirebaseEnabled) {
    listeners.add(callback);
    callback(getLocalCarousel(), null);
    return () => {
      listeners.delete(callback);
    };
  }

  return onValue(
    ref(db, PATH),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val(), null);
      } else {
        callback(DEFAULT_CAROUSEL_SLIDES, null);
      }
    },
    (error) => {
      callback(DEFAULT_CAROUSEL_SLIDES, error);
    }
  );
}

export function saveCarousel(slides) {
  if (!isFirebaseEnabled) {
    setLocalCarousel(slides);
    notifyListeners();
    return Promise.resolve();
  }
  return set(ref(db, PATH), slides);
}
