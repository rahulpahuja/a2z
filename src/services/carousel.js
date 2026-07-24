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
    id: 'slide_2',
    title: 'Royal Bridal Heritage',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNqdxRl1N12xTjFuuqWlyyCZgDvVutGsMr_a2j2bIXK0l146oUipKrvoOi5TBuB-oGD_oXFhaMMvWX9ToRlYXqI_Yw50wGMn8B9Y2-NdTGVDySAn6Wkx3EPanZT-At_TWaCri_mqVSqRgy0xZJE-4rSaxqy9oqS2YhRKJ2KBntvIIFonkdK-fXfAEZ6tjvyIyO7wowXYuLs9Y6HrCaXkMNAMUrM90UB503ceap0i_zhLZSlILzrhQCrw',
    alt: 'A heavily embroidered Bridal Lehenga in deep maroon and gold, presented in a high-end editorial style that highlights the intricate craftsmanship.',
    cta: 'Explore Bridal',
    link: '/products?category=Lehenga',
  },
  {
    id: 'slide_3',
    title: 'Contemporary Luxury Coords',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGeEDQ9fsFvJl2R1sCNwJ9yZ_csqnlzRo6BUr-0UQv_sIOvILMQLjnhDLoRtWkmd5Jh07aZ2yk1IOYUhs5mO0elyMGF2KVzF_knqXKbyTJS4LoDLvCnoaYyQbcVvaQ44eJmurH6w5WK3_UODg-AhFU5z_Jlyp2hy6NeSPwLj7K14xOD1bikOxybrQ-W5rXfvCqNEFtr7nWPxMmVGAtP8eiOxRuR64VuGO7HOu8VOvU8Z3ognrTGtPAxw',
    alt: 'A contemporary Coord set featuring a tunic and wide-leg trousers in a soft Dusty Rose with subtle, traditional block-print patterns.',
    cta: 'Discover Coords',
    link: '/products?category=Coord Set',
  },
  {
    id: 'slide_4',
    title: 'Artisanal Kanchipuram Silk Sarees',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCv3KPgrZRODFQ6eUEl1H3ELdLp5WZYz2VdTDqekp1J2wft_BkcW15WNkdcRXqBwqZqyZWzctihcLP1u_M8zoYSMRgZ98AUg8tidkkBQmIP7SFTSK271F5tuHdYtHRCLtMdAdXuWwoxN10hap1INE0ra8-NUSdfIXzUZzqOOzU8bxQqAfzs9yLLdXD8Oq4LPIe1Zp7W9woX0uxiW8A9HogoQYQECeZQL_tm5F_uHiQIMYNhMInyUCtWSQ',
    alt: 'A luxurious Sage Green silk Saree with a rich, woven border, elegantly draped on a mannequin.',
    cta: 'Browse Silk Sarees',
    link: '/products?category=Saree',
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
