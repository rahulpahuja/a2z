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
    
    root.style.setProperty('--custom-store-bg', themeData.storeBgColor);
    root.style.setProperty('--custom-backdrop-filter', themeData.backdropFilter);
    root.style.setProperty('--custom-backdrop-bg', themeData.backdropBg);
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
