import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const StorefrontThemeContext = createContext(null);

export const DEFAULT_THEME = {
  // Sizing
  listingImgAspect: '3/4',    // '3/4', '1/1', '16/9', '4/3'
  detailImgAspect: '3/4',     // '3/4', '1/1', '16/9', '4/3'
  galleryThumbW: '64px',
  galleryThumbH: '80px',
  
  // Borders
  borderRadius: '16px',
  borderRadiusSm: '8px',
  borderWidth: '1px',
  borderColor: '#DCAE96',
  
  // Typography
  titleSizeListing: '14px',
  descSizeListing: '12px',
  priceSizeListing: '14px',
  titleSizeDetail: '28px',
  descSizeDetail: '16px',
  
  // Backgrounds / Backdrops
  storeBgColor: '#ffffff',
  backdropFilter: 'none',     // 'none', 'blur(8px)', 'blur(16px)'
  backdropBg: 'transparent',
  primaryColor: '#ac2471',
  themeMode: 'light',         // 'light' | 'dark' | 'midnight'

  // Pagination & Layout Grid Sizing
  itemsPerPage: 400,
  gridCols: 4,
};

const THEME_STORAGE_KEY = 'storefront_theme_settings';

export function StorefrontThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  // Apply theme configs directly to DOM root CSS variables
  const applyThemeToDom = (themeData) => {
    const root = document.documentElement;
    root.style.setProperty('--custom-listing-img-aspect', themeData.listingImgAspect);
    root.style.setProperty('--custom-detail-img-aspect', themeData.detailImgAspect);
    root.style.setProperty('--custom-gallery-thumb-w', themeData.galleryThumbW);
    root.style.setProperty('--custom-gallery-thumb-h', themeData.galleryThumbH);
    
    root.style.setProperty('--custom-border-radius', themeData.borderRadius);
    root.style.setProperty('--custom-border-radius-sm', themeData.borderRadiusSm);
    root.style.setProperty('--custom-border-width', themeData.borderWidth);
    root.style.setProperty('--custom-border-color', themeData.borderColor);
    
    root.style.setProperty('--custom-font-title-size', themeData.titleSizeListing);
    root.style.setProperty('--custom-font-desc-size', themeData.descSizeListing);
    root.style.setProperty('--custom-font-price-size', themeData.priceSizeListing);
    
    root.style.setProperty('--custom-font-title-size-detail', themeData.titleSizeDetail);
    root.style.setProperty('--custom-font-desc-size-detail', themeData.descSizeDetail);
    
    // Apply dark/light/midnight theme modes
    if (themeData.themeMode === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--color-background', '#121212');
      root.style.setProperty('--color-on-background', '#f5f5f5');
      root.style.setProperty('--color-on-surface', '#f5f5f5');
      root.style.setProperty('--color-surface-container-lowest', '#1e1e1e');
      root.style.setProperty('--color-surface-container-low', '#1c1b1b');
      root.style.setProperty('--color-surface-container', '#2a2a2a');
      root.style.setProperty('--color-surface-container-high', '#333333');
      root.style.setProperty('--color-surface-container-highest', '#3a3a3a');
      root.style.setProperty('--color-outline-variant', '#3a3a3a');
      root.style.setProperty('--custom-store-bg', '#121212');
    } else if (themeData.themeMode === 'midnight') {
      root.classList.add('dark');
      root.style.setProperty('--color-background', '#030712');
      root.style.setProperty('--color-on-background', '#f9fafb');
      root.style.setProperty('--color-on-surface', '#f9fafb');
      root.style.setProperty('--color-surface-container-lowest', '#0b0f19');
      root.style.setProperty('--color-surface-container-low', '#0a0d16');
      root.style.setProperty('--color-surface-container', '#111827');
      root.style.setProperty('--color-surface-container-high', '#1f2937');
      root.style.setProperty('--color-surface-container-highest', '#374151');
      root.style.setProperty('--color-outline-variant', '#1f2937');
      root.style.setProperty('--custom-store-bg', '#030712');
    } else {
      // Light Mode (Default)
      root.classList.remove('dark');
      root.style.setProperty('--color-background', '#fcf9f826');
      root.style.setProperty('--color-on-background', '#1c1b1b');
      root.style.setProperty('--color-on-surface', '#1c1b1b');
      root.style.setProperty('--color-surface-container-lowest', '#ffffffb3');
      root.style.setProperty('--color-surface-container-low', '#f6f3f2a6');
      root.style.setProperty('--color-surface-container', '#f0eded99');
      root.style.setProperty('--color-surface-container-high', '#eae7e7b3');
      root.style.setProperty('--color-surface-container-highest', '#e5e2e1cc');
      root.style.setProperty('--color-outline-variant', '#dcbfc9');
      root.style.setProperty('--custom-store-bg', themeData.storeBgColor || '#ffffff');
    }
    
    root.style.setProperty('--custom-backdrop-filter', themeData.backdropFilter);
    root.style.setProperty('--custom-backdrop-bg', themeData.backdropBg);
    
    // Dynamically skin all primary accent sub-colors site-wide (including containers and fixed tones)
    const prim = themeData.primaryColor || '#ac2471';
    root.style.setProperty('--color-primary', prim);
    root.style.setProperty('--color-surface-tint', prim);
    root.style.setProperty('--color-primary-container', prim);
    root.style.setProperty('--color-inverse-primary', prim);
    if (prim.startsWith('#') && prim.length === 7) {
      root.style.setProperty('--color-primary-fixed-dim', prim + 'cc');
      root.style.setProperty('--color-primary-fixed', prim + '26');
      root.style.setProperty('--color-on-primary-container', '#ffffff');
    }

    // Custom pagination and grid settings
    root.style.setProperty('--custom-grid-cols', themeData.gridCols);
  };

  // Subscribe to theme configurations
  useEffect(() => {
    if (isFirebaseEnabled && db) {
      const themeRef = ref(db, 'settings/storefront_theme');
      const unsubscribe = onValue(themeRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const merged = { ...DEFAULT_THEME, ...val };
          setTheme(merged);
          applyThemeToDom(merged);
        } else {
          setTheme(DEFAULT_THEME);
          applyThemeToDom(DEFAULT_THEME);
        }
        setLoading(false);
      }, (err) => {
        console.error('Firebase theme subscription error:', err);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      try {
        const local = localStorage.getItem(THEME_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          const merged = { ...DEFAULT_THEME, ...parsed };
          setTheme(merged);
          applyThemeToDom(merged);
        } else {
          applyThemeToDom(DEFAULT_THEME);
        }
      } catch (e) {
        console.error('Failed reading local theme settings:', e);
      }
      setLoading(false);
      return undefined;
    }
  }, []);

  const updateTheme = async (nextTheme) => {
    const merged = { ...theme, ...nextTheme };
    setTheme(merged);
    applyThemeToDom(merged);
    
    if (isFirebaseEnabled && db) {
      const themeRef = ref(db, 'settings/storefront_theme');
      await set(themeRef, merged);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(merged));
    }
  };

  const resetTheme = async () => {
    setTheme(DEFAULT_THEME);
    applyThemeToDom(DEFAULT_THEME);
    
    if (isFirebaseEnabled && db) {
      const themeRef = ref(db, 'settings/storefront_theme');
      await set(themeRef, DEFAULT_THEME);
    } else {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  };

  const value = useMemo(() => ({
    theme,
    loading,
    updateTheme,
    resetTheme,
  }), [theme, loading]);

  return (
    <StorefrontThemeContext.Provider value={value}>
      {children}
    </StorefrontThemeContext.Provider>
  );
}

export function useStorefrontTheme() {
  const context = useContext(StorefrontThemeContext);
  if (!context) {
    throw new Error('useStorefrontTheme must be used within a StorefrontThemeProvider');
  }
  return context;
}
