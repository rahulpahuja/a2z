import { onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const PATH = 'settings/categoryBubbles';

// The circular "shop by category" bubbles on the homepage — historically a
// hardcoded array in HomePage.jsx. `link` follows the same convention as
// carousel slides (see services/carousel.js) so the existing link-picker
// helpers in AdminConfiguratorPage.jsx work unchanged for these too.
export const DEFAULT_CATEGORY_BUBBLES = [
  {
    id: 'bubble_1',
    name: 'Bags',
    alt: 'A close-up product shot of a luxury, artisanal embroidered clutch bag featuring traditional Indian motifs in gold and Dusty Rose. Set against a clean, off-white minimalist background with soft studio lighting. High-end fashion aesthetic.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBpGsco9fEpO7fBmbPz1f4WPhiBRCzE1yC-LdMULIAPj1oqU3lfvN3uW1OTgOf8XGauNEf60TzYn_zruaXYYiAgwTpgyEpBBz-YxV32Gsy6MVJkCMq_rm4WSfGj2nzOp9dRwph9cXMeePowLBWAap4YT_A6pwbcO3UMOxuKHGmvy4optk8AZwfbDwRkDs9o7nH-ZriqLJ3ThdC6_ih_QFrL67RmXwKJj9BmZ93cRqDs1gOr8QcixZxl3A',
    link: '/products?category=Bags',
  },
  {
    id: 'bubble_2',
    name: 'Best Sellers',
    alt: 'A close-up detailed shot of a best-selling intricate Kundan jewelry set and a folded silk fabric piece in vibrant Hot Pink. Minimalist off-white background, soft premium lighting, high visual fidelity.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDZJtx7cbsa-MVraxiDeswXCPttghVa_D3gmW5QD6L0KoHo_5mstPG-bRrOnzuIjtQWCuRRgIVRAZ7Lplm6AdviVFeBo7ECADEqzUpw91leHwUvbHW0F5LYWKZaYY1pDI_JPxpiKM_7mSrht17kz4I5GOtsRNBihTMt9KFsvnBUal_U54a1gGtOcxHV4M9Wsvn-u7MgORQhHPoBh434MfS1geJJkUDbJWJEDXWoxyRQYurpemwEASfPcw',
    link: '/products',
  },
  {
    id: 'bubble_3',
    name: 'Coords',
    alt: 'A stylish, contemporary Indian coordinated set (coord) in Sage Green with subtle artisanal embroidery, displayed neatly folded or on a minimalist hanger against a clean white background. High-end boutique feel.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAapWrtxtpoZLXabbFvrHMqCEyyeVbb5bDIedIyh6taScQaZzribPGI8x5SXkyLNP_iWKAAiGwNki6pETcpqW1eLoy6CmQ8_UtpymntauMUMZgxLX1_uFhEVVgKuukhyMs-_Oo4WSSiFukIHBtv2c6UWizNIVcIfAa8Tj3rYrhMv78JYEN7sVy4DCMq2P0LscHMifD-1z36kJvwxWPUgS_i3AztQzcz76HbzLuIrmY7pz6cDY-3b0vdVg',
    link: '/products?category=Coord Set',
  },
  {
    id: 'bubble_4',
    name: 'New Arrivals',
    alt: 'A macro shot of a new arrival traditional textile, showcasing vibrant rich colors and intricate weaving patterns, possibly a close up of a Saree pallu. Soft, bright lighting, luxury gallery aesthetic.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD3VetkJP_eWca_ztCnWaCquOYSWAk1yXdxkzQ0BAGxUk727Cjv38MxiVDrH5fovo6z1AlfgEBNLLeghJ66uv6qTr7gbWPd9M_e9pRSycSYyZ2zhuki1e9sKWOT_S0Vqg6iKkp9FJsxUqLsyB5o2khg8c-4BudANR2IJdi2VAKLjdUp2xXKHjO7_PADSHX0bR_HkKfB8vZWCvekT_ieHLap-wHcI7S4jIOJkfrpAEK0QAWszA_nhAlhAg',
    link: '/products',
  },
  {
    id: 'bubble_5',
    name: 'Tops',
    alt: 'A beautifully crafted contemporary Indian top or Kurti featuring delicate hand-block prints in Dusty Rose and off-white. Clean, minimalist presentation, high-quality fabric texture visible.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDo72VPkQwTN-Nmw1841eShwujwrb6VLMYl1AgelJas6CTCahaUnpIbtUUyhDIhebhC4yNc2fN2Ty-cI7wQh3QCgKJ-htnxBBQWO3-IeXU0srtoApCiVFxKri75kPFYnBa7BBywf8dWlL9G-OmTfjFUfBLaMPEbuWQBK7Eu_5ZjR1pmDJ81P6JojGEaK0AQqqX5fm_8Ik6x0b0FEDr7MXCFjzhpFlMwyxD7XYu_UtzFb_j0a9LtG1bnoQ',
    link: '/products?category=Tops',
  },
  {
    id: 'bubble_6',
    name: 'Trousers',
    alt: 'A pair of tailored, elegant trousers with a subtle traditional Indian print trim, presented in a minimalist, modern aesthetic against a bright, clean background. Premium fashion product photography.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAByvkDLFfLo4dnG7PGvRQ0FIcxM8lm3ZuLwOJpAcO4v_lp9eNrz6TLunpW4W7xUeVbltFq4jSWl2jT4yfsMeW_hCaqZrIh1y9e6y31imuerfXQMNnr56c9-wquxsPfgGoVG4ocOyAYoNjvCIQSVHPXdzZUarn3Zvy8FKoHQKyBU9x4YqLVMuUJlMDiDkHXT1Mp7F3tHA3-T29yUWGbdqOkusu17LSvGbGq7Kv-k7Qc80cflf50nA-Kew',
    link: '/products?category=Trousers',
  },
];

function getLocalCategoryBubbles() {
  try {
    const data = localStorage.getItem(PATH);
    return data ? JSON.parse(data) : DEFAULT_CATEGORY_BUBBLES;
  } catch {
    return DEFAULT_CATEGORY_BUBBLES;
  }
}

function setLocalCategoryBubbles(bubbles) {
  localStorage.setItem(PATH, JSON.stringify(bubbles));
}

const listeners = new Set();
function notifyListeners() {
  const data = getLocalCategoryBubbles();
  listeners.forEach((listener) => listener(data, null));
}

export function subscribeToCategoryBubbles(callback) {
  if (!isFirebaseEnabled) {
    listeners.add(callback);
    callback(getLocalCategoryBubbles(), null);
    return () => {
      listeners.delete(callback);
    };
  }

  return onValue(
    ref(db, PATH),
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : DEFAULT_CATEGORY_BUBBLES, null);
    },
    (error) => {
      callback(DEFAULT_CATEGORY_BUBBLES, error);
    }
  );
}

export function saveCategoryBubbles(bubbles) {
  if (!isFirebaseEnabled) {
    setLocalCategoryBubbles(bubbles);
    notifyListeners();
    return Promise.resolve();
  }
  return set(ref(db, PATH), bubbles);
}
