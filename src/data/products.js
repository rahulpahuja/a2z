export const PRODUCTS = [];

import { getHighResUrl } from '../utils/image.js';

PRODUCTS.forEach((product) => {
  if (product.image) {
    product.image = getHighResUrl(product.image);
  }
});

export const getProductById = (id) => PRODUCTS.find((product) => product.id === id) ?? null;
