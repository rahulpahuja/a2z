import { useState, useEffect } from 'react';
import { useStorefrontTheme, DEFAULT_THEME } from '../../context/StorefrontThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useProducts } from '../../context/ProductsContext.jsx';
import './AdminConfiguratorPage.css';

export default function AdminConfiguratorPage() {
  const { theme, updateTheme, resetTheme, loading } = useStorefrontTheme();
  const { showToast } = useToast();
  const { products } = useProducts();

  // Local form states (initialized when theme loads)
  const [form, setForm] = useState(DEFAULT_THEME);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState('listing'); // 'listing' | 'detail'

  // Diagnostic Test States
  const [diagStatus, setDiagStatus] = useState(null); // 'running', 'passed', 'failed'
  const [diagResults, setDiagResults] = useState([]);
  const [productHasVideoMap, setProductHasVideoMap] = useState({});

  useEffect(() => {
    if (products && products.length > 0) {
      const map = {};
      products.forEach((p) => {
        map[p.id] = (p.videos && p.videos.length > 0);
      });
      setProductHasVideoMap(map);
    }
  }, [products]);

  useEffect(() => {
    if (theme) {
      setForm(theme);
    }
  }, [theme]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateTheme(form);
      showToast('Storefront theme configurations saved successfully.');
    } catch (err) {
      showToast(err.message || 'Could not save theme configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset storefront theme configurations to default values?')) {
      setIsSaving(true);
      try {
        await resetTheme();
        setForm(DEFAULT_THEME);
        showToast('Storefront theme configurations reset to factory defaults.');
      } catch (err) {
        showToast(err.message || 'Could not reset theme configuration.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Programmatic Diagnostic Assertions Test Suite
  const runDiagnostics = async () => {
    setDiagStatus('running');
    setDiagResults([]);
    const results = [];

    const assert = (name, assertion) => {
      try {
        const passed = assertion();
        results.push({ name, status: passed ? 'pass' : 'fail', message: passed ? 'Assertion passed.' : 'Value mismatch.' });
        return passed;
      } catch (e) {
        results.push({ name, status: 'fail', message: e.message });
        return false;
      }
    };

    setIsSaving(true);
    try {
      // Test Case 1: Write Custom Parameters & Validate state
      const testParameters = {
        listingImgAspect: '16/9',
        detailImgAspect: '1/1',
        galleryThumbW: '72px',
        galleryThumbH: '90px',
        borderRadius: '20px',
        borderRadiusSm: '10px',
        borderWidth: '3px',
        borderColor: '#ff0055',
        titleSizeListing: '17px',
        descSizeListing: '13px',
        priceSizeListing: '15px',
        titleSizeDetail: '33px',
        descSizeDetail: '17px',
        storeBgColor: '#121212',
        backdropFilter: 'blur(10px)',
        backdropBg: 'rgba(0,0,0,0.5)',
        itemsPerPage: 150,
        gridCols: 6,
        primaryColor: '#ff0055',
        themeMode: 'dark',
      };

      // Apply test parameters
      await updateTheme(testParameters);

      // Assert state updated
      assert('Theme state is populated with test configs', () => {
        const root = document.documentElement;
        return root.style.getPropertyValue('--custom-listing-img-aspect') === '16/9' &&
               root.style.getPropertyValue('--custom-border-color') === '#ff0055' &&
               root.style.getPropertyValue('--color-primary') === '#ff0055' &&
               root.classList.contains('dark');
      });

      // Assert DOM variables update
      assert('DOM Root contains correct --custom-listing-img-aspect value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-listing-img-aspect');
        return value === '16/9';
      });

      assert('DOM Root contains correct --custom-border-radius value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-border-radius');
        return value === '20px';
      });

      assert('DOM Root contains correct --custom-border-width value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-border-width');
        return value === '3px';
      });

      assert('DOM Root contains correct --custom-font-title-size value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-font-title-size');
        return value === '17px';
      });

      assert('DOM Root contains correct --custom-store-bg value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-store-bg');
        return value === '#121212';
      });

      assert('DOM Root contains correct --custom-grid-cols value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-grid-cols');
        return value === '6';
      });

      assert('DOM Root contains correct --color-primary value', () => {
        const value = document.documentElement.style.getPropertyValue('--color-primary');
        return value === '#ff0055';
      });

      // Test Case 2: Reset and check defaults
      await resetTheme();
      assert('Resetting parameters restores default --custom-listing-img-aspect value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-listing-img-aspect');
        return value === DEFAULT_THEME.listingImgAspect;
      });

      assert('Resetting parameters restores default --custom-border-radius value', () => {
        const value = document.documentElement.style.getPropertyValue('--custom-border-radius');
        return value === DEFAULT_THEME.borderRadius;
      });

      // Restore form state
      await updateTheme(form);

      const allPassed = results.every((r) => r.status === 'pass');
      setDiagResults(results);
      setDiagStatus(allPassed ? 'passed' : 'failed');
      if (allPassed) {
        showToast('Storefront theme diagnostic checks passed successfully.');
      } else {
        showToast('Diagnostic checks completed with failure assertions.');
      }
    } catch (e) {
      results.push({ name: 'System Process Execution', status: 'fail', message: e.message });
      setDiagResults(results);
      setDiagStatus('failed');
      showToast(`Diagnostic Execution Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container flex items-center justify-center min-h-[60vh] text-on-surface-variant">
        Loading Configurator Portal...
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Storefront Configurator Portal</h1>
        <p className="admin-page-subtitle">
          Customize product card sizes, borders, typography, background colors, and backdrop settings dynamically.
        </p>
      </header>

      <main className="admin-main-container flex flex-col gap-8">
        
        {/* Diagnostic Assertions Panel */}
        <section className="admin-card flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-outline-variant/20">
            <div className="space-y-1">
              <h2 className="admin-card-title flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">flaky</span>
                Programmatic Layout Diagnostics
              </h2>
              <p className="admin-card-subtitle">
                Automated test assertions confirming theme database writes, state bindings, and DOM CSS variable injections.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0 flex-wrap">
              {diagStatus && (
                <span className={`status-badge px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] ${
                  diagStatus === 'passed' ? 'test-badge-passed' :
                  diagStatus === 'failed' ? 'test-badge-failed' :
                  'test-badge-running'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {diagStatus === 'passed' ? 'check_circle' :
                     diagStatus === 'failed' ? 'cancel' :
                     'progress_activity'}
                  </span>
                  Diagnostics: {diagStatus.toUpperCase()}
                </span>
              )}
              <button
                onClick={runDiagnostics}
                disabled={isSaving}
                className="btn btn-secondary text-[11px] py-2 px-4"
              >
                Run Layout Assertions
              </button>
            </div>
          </div>

          {diagResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diagResults.map((res, i) => (
                <div key={i} className="test-card-box flex items-start gap-3">
                  <span className={`material-symbols-outlined shrink-0 text-[18px] ${
                    res.status === 'pass' ? 'text-secondary' : 'text-error'
                  }`}>
                    {res.status === 'pass' ? 'check_circle' : 'cancel'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-on-surface text-[12px]">{res.name}</p>
                    <p className="text-[10px] text-on-surface-variant/80 mt-0.5">{res.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Configuration forms and Live Previews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Settings configurator */}
          <form onSubmit={handleSave} className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Sizing and Image Layouts */}
            <div className="admin-card flex flex-col gap-5">
              <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">aspect_ratio</span>
                1. Image Dimensions &amp; Viewports
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="listing-aspect">
                    Listing Grid Image Aspect Ratio
                  </label>
                  <select
                    id="listing-aspect"
                    value={form.listingImgAspect}
                    onChange={(e) => handleChange('listingImgAspect', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="3/4">Portrait (3:4 - Recommended)</option>
                    <option value="1/1">Square (1:1)</option>
                    <option value="4/3">Landscape (4:3)</option>
                    <option value="16/9">Widescreen (16:9)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="detail-aspect">
                    Detail Page Main Image Aspect Ratio
                  </label>
                  <select
                    id="detail-aspect"
                    value={form.detailImgAspect}
                    onChange={(e) => handleChange('detailImgAspect', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="3/4">Portrait (3:4)</option>
                    <option value="1/1">Square (1:1 - Recommended)</option>
                    <option value="4/3">Landscape (4:3)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="gallery-thumb-w">
                    Gallery Thumbnail Width
                  </label>
                  <select
                    id="gallery-thumb-w"
                    value={form.galleryThumbW}
                    onChange={(e) => handleChange('galleryThumbW', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="56px">56px</option>
                    <option value="64px">64px (Default)</option>
                    <option value="72px">72px</option>
                    <option value="80px">80px</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="gallery-thumb-h">
                    Gallery Thumbnail Height
                  </label>
                  <select
                    id="gallery-thumb-h"
                    value={form.galleryThumbH}
                    onChange={(e) => handleChange('galleryThumbH', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="70px">70px</option>
                    <option value="80px">80px (Default)</option>
                    <option value="90px">90px</option>
                    <option value="100px">100px</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Borders and Shapes config */}
            <div className="admin-card flex flex-col gap-5">
              <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">border_outer</span>
                2. Cards &amp; Image Borders
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="border-radius">
                    Main Border Radius (Cards &amp; main images)
                  </label>
                  <select
                    id="border-radius"
                    value={form.borderRadius}
                    onChange={(e) => handleChange('borderRadius', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="0px">Sharp Corner (0px)</option>
                    <option value="8px">Rounded Soft (8px)</option>
                    <option value="12px">Rounded Elegant (12px)</option>
                    <option value="16px">Luxury Curve (16px - Default)</option>
                    <option value="24px">Pill Corner (24px)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="border-radius-sm">
                    Thumbnail Border Radius
                  </label>
                  <select
                    id="border-radius-sm"
                    value={form.borderRadiusSm}
                    onChange={(e) => handleChange('borderRadiusSm', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="0px">Sharp Corner (0px)</option>
                    <option value="4px">Extra Small (4px)</option>
                    <option value="6px">Small (6px)</option>
                    <option value="8px">Medium (8px - Default)</option>
                    <option value="12px">Large (12px)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="border-width">
                    Border Width (Thickness)
                  </label>
                  <select
                    id="border-width"
                    value={form.borderWidth}
                    onChange={(e) => handleChange('borderWidth', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="0px">None (0px)</option>
                    <option value="1px">Thin (1px - Default)</option>
                    <option value="2px">Medium (2px)</option>
                    <option value="3px">Thick (3px)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Border Color
                  </label>
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      value={form.borderColor.startsWith('#') ? form.borderColor : '#DCAE96'}
                      onChange={(e) => handleChange('borderColor', e.target.value)}
                      className="color-picker-input"
                    />
                    <input
                      type="text"
                      value={form.borderColor}
                      onChange={(e) => handleChange('borderColor', e.target.value)}
                      placeholder="#DCAE96"
                      className="form-input text-[12px] py-1.5 px-3 flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Sizing config */}
            <div className="admin-card flex flex-col gap-5">
              <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">format_size</span>
                3. Font Scaling / Typography sizes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="title-size-list">
                    Listing Card Title Size
                  </label>
                  <select
                    id="title-size-list"
                    value={form.titleSizeListing}
                    onChange={(e) => handleChange('titleSizeListing', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="12px">Compact (12px)</option>
                    <option value="14px">Regular (14px - Default)</option>
                    <option value="16px">Semibold (16px)</option>
                    <option value="18px">Large (18px)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="desc-size-list">
                    Listing Card Description Size
                  </label>
                  <select
                    id="desc-size-list"
                    value={form.descSizeListing}
                    onChange={(e) => handleChange('descSizeListing', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="10px">Extra Small (10px)</option>
                    <option value="11px">Small (11px)</option>
                    <option value="12px">Regular (12px - Default)</option>
                    <option value="13px">Medium (13px)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="price-size-list">
                    Listing Card Price Size
                  </label>
                  <select
                    id="price-size-list"
                    value={form.priceSizeListing}
                    onChange={(e) => handleChange('priceSizeListing', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="12px">Regular (12px)</option>
                    <option value="14px">Semibold (14px - Default)</option>
                    <option value="16px">Large (16px)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="title-size-detail">
                    Detail Page Main Title Size
                  </label>
                  <select
                    id="title-size-detail"
                    value={form.titleSizeDetail}
                    onChange={(e) => handleChange('titleSizeDetail', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="20px">Small (20px)</option>
                    <option value="24px">Medium (24px)</option>
                    <option value="28px">Regular (28px - Default)</option>
                    <option value="32px">Display (32px)</option>
                    <option value="36px">Headline (36px)</option>
                  </select>
                </div>

                <div className="form-group sm:col-span-2">
                  <label className="form-label" htmlFor="desc-size-detail">
                    Detail Page Description Paragraph Size
                  </label>
                  <select
                    id="desc-size-detail"
                    value={form.descSizeDetail}
                    onChange={(e) => handleChange('descSizeDetail', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="13px">Small (13px)</option>
                    <option value="14px">Medium (14px)</option>
                    <option value="15px">Regular (15px)</option>
                    <option value="16px">Comfortable (16px - Default)</option>
                    <option value="18px">Spacious (18px)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Background and Backdrops */}
            <div className="admin-card flex flex-col gap-5">
              <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                4. Backgrounds &amp; Backdrop Filters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group sm:col-span-2">
                  <label className="form-label font-semibold" htmlFor="theme-mode">
                    Base Theme Mode
                  </label>
                  <select
                    id="theme-mode"
                    value={form.themeMode || 'light'}
                    onChange={(e) => handleChange('themeMode', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="light">Light Theme (Classic)</option>
                    <option value="dark">Dark Theme (Modern Sleek)</option>
                    <option value="midnight">Midnight Theme (Deep Luxury Blue/Black)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Main Store Background Color
                  </label>
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      value={form.storeBgColor.startsWith('#') ? form.storeBgColor : '#ffffff'}
                      onChange={(e) => handleChange('storeBgColor', e.target.value)}
                      className="color-picker-input"
                    />
                    <input
                      type="text"
                      value={form.storeBgColor}
                      onChange={(e) => handleChange('storeBgColor', e.target.value)}
                      placeholder="#ffffff"
                      className="form-input text-[12px] py-1.5 px-3 flex-1"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="backdrop-filter">
                    Backdrop Glass Filter (blur)
                  </label>
                  <select
                    id="backdrop-filter"
                    value={form.backdropFilter}
                    onChange={(e) => handleChange('backdropFilter', e.target.value)}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value="none">None (No blur)</option>
                    <option value="blur(4px)">Subtle blur (4px)</option>
                    <option value="blur(8px)">Medium blur (8px)</option>
                    <option value="blur(16px)">Glassmorphism (16px)</option>
                  </select>
                </div>

                <div className="form-group sm:col-span-2">
                  <label className="form-label" htmlFor="backdrop-bg">
                    Backdrop Overlay Background / Gradient Style
                  </label>
                  <input
                    id="backdrop-bg"
                    type="text"
                    value={form.backdropBg}
                    onChange={(e) => handleChange('backdropBg', e.target.value)}
                    placeholder="e.g. rgba(255,255,255,0.85) or linear-gradient(180deg, #fff, #f5f5f5)"
                    className="form-input text-[12px] py-2 px-3"
                  />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    Accepts CSS transparency overlays (RGBA) or gradients applied behind gallery, detail layouts, or listings.
                  </p>
                </div>

                <div className="form-group sm:col-span-2 border-t border-outline-variant/20 pt-4 mt-2">
                  <label className="form-label font-semibold text-primary">
                    Branding Theme Primary Color (Site-wide highlights)
                  </label>
                  <div className="flex flex-col gap-3">
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={form.primaryColor?.startsWith('#') ? form.primaryColor : '#ac2471'}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        className="color-picker-input"
                      />
                      <input
                        type="text"
                        value={form.primaryColor || '#ac2471'}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        placeholder="#ac2471"
                        className="form-input text-[12px] py-1.5 px-3 flex-1"
                      />
                    </div>
                    
                    {/* Preset color swatches */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] text-on-surface-variant font-mono mr-1">Presets:</span>
                      {[
                        { label: 'Royal Pink', hex: '#ac2471' },
                        { label: 'Luxury Gold', hex: '#c5a880' },
                        { label: 'Indigo Royal', hex: '#3f51b5' },
                        { label: 'Emerald Teal', hex: '#008080' },
                        { label: 'Crimson Velvet', hex: '#b30000' },
                        { label: 'Marigold Gold', hex: '#ff9f1c' },
                      ].map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => handleChange('primaryColor', preset.hex)}
                          className="px-2 py-1 rounded text-[10px] border border-outline-variant/30 hover:border-primary transition-all flex items-center gap-1.5"
                          style={{ backgroundColor: `${preset.hex}15`, color: preset.hex }}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    Sets the primary accent color applied site-wide to buttons, highlights, badges, star ratings, and links.
                  </p>
                </div>
              </div>
            </div>
            {/* Pagination & Grid Layout Settings */}
            <div className="admin-card flex flex-col gap-5">
              <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">grid_on</span>
                5. Pagination &amp; Catalog Layout
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="items-per-page">
                    Max Items Per Page (Pagination Limit)
                  </label>
                  <input
                    id="items-per-page"
                    type="number"
                    min="50"
                    value={form.itemsPerPage || 400}
                    onChange={(e) => {
                      const val = Math.max(50, Number(e.target.value));
                      handleChange('itemsPerPage', val);
                    }}
                    required
                    className="form-input text-[12px] py-2 px-3"
                  />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    Must be at least 50. Controls when catalog paginates to prevent infinite scrolling performance lag.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="grid-cols">
                    Desktop Grid columns (Items in a Row)
                  </label>
                  <select
                    id="grid-cols"
                    value={form.gridCols || 4}
                    onChange={(e) => handleChange('gridCols', Number(e.target.value))}
                    className="form-select text-[12px] py-2 px-3"
                  >
                    <option value={4}>4 items in a row (Default)</option>
                    <option value={5}>5 items in a row</option>
                    <option value={6}>6 items in a row</option>
                  </select>
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    Configures row capacity on large desktop screens.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Image Hover Auto-Slide */}
            <div className="admin-card flex flex-col gap-5">
              <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">animation</span>
                Product Image Hover Auto-Slide
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="hover-slide-delay">
                    Hover Delay Before Sliding (ms)
                  </label>
                  <input
                    id="hover-slide-delay"
                    type="number"
                    min="0"
                    step="100"
                    value={form.productHoverSlideDelayMs ?? 1000}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      handleChange('productHoverSlideDelayMs', val);
                    }}
                    className="form-input text-[12px] py-2 px-3"
                  />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    How long a shopper must hover over a product image (gallery, homepage rows, product detail) before it starts auto-sliding through the other images.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="hover-slide-interval">
                    Time Between Slides (ms)
                  </label>
                  <input
                    id="hover-slide-interval"
                    type="number"
                    min="200"
                    step="100"
                    value={form.productHoverSlideIntervalMs ?? 1800}
                    onChange={(e) => {
                      const val = Math.max(200, Number(e.target.value));
                      handleChange('productHoverSlideIntervalMs', val);
                    }}
                    className="form-input text-[12px] py-2 px-3"
                  />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    How long each image stays visible once the auto-slide begins.
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Stories in Motion Video Lookbooks */}
            <div className="admin-card flex flex-col gap-5">
              <h3 className="font-title-sm text-[15px] text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">movie</span>
                6. Stories in Motion (Video Lookbooks)
              </h3>
              
              <div className="space-y-6">
                {(form.lookbookVideos || []).map((video, idx) => (
                  <div key={video.id || idx} className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/50 flex flex-col gap-3">
                    <h4 className="text-[12px] font-bold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">play_circle</span>
                      Video Slot {idx + 1}
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="form-group">
                        <label className="form-label text-[11px]" htmlFor={`video-title-${idx}`}>
                          Video Title
                        </label>
                        <input
                          id={`video-title-${idx}`}
                          type="text"
                          value={video.title || ''}
                          onChange={(e) => {
                            const updated = [...(form.lookbookVideos || [])];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            handleChange('lookbookVideos', updated);
                          }}
                          placeholder="e.g. Vibrant Rani Pink Lookbook"
                          className="form-input text-[11px] py-1.5 px-3"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label text-[11px]" htmlFor={`video-desc-${idx}`}>
                          Description
                        </label>
                        <input
                          id={`video-desc-${idx}`}
                          type="text"
                          value={video.description || ''}
                          onChange={(e) => {
                            const updated = [...(form.lookbookVideos || [])];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            handleChange('lookbookVideos', updated);
                          }}
                          placeholder="e.g. Witness the detailed gold zari embroidery..."
                          className="form-input text-[11px] py-1.5 px-3"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10">
                      <div className="form-group">
                        <label className="form-label text-[11px]">Video Source Mode</label>
                        <select
                          value={video.sourceMode || (video.src?.startsWith('blob:') || video.src?.startsWith('data:') ? 'upload' : 'url')}
                          onChange={(e) => {
                            const mode = e.target.value;
                            const updated = [...(form.lookbookVideos || [])];
                            updated[idx] = { ...updated[idx], sourceMode: mode, selectedProductId: '' };
                            handleChange('lookbookVideos', updated);
                          }}
                          className="form-select text-[11px] py-1.5 px-2"
                        >
                          <option value="url">Paste Custom Video URL</option>
                          <option value="preset">Select Mixkit Luxury Preset</option>
                          <option value="upload">Upload Custom MP4 Video File</option>
                          <option value="product">Select from Product Videos</option>
                        </select>
                      </div>

                      {/* URL input field */}
                      {(video.sourceMode === 'url' || (!video.sourceMode && !video.src?.startsWith('blob:'))) && (
                        <div className="form-group">
                          <label className="form-label text-[11px]" htmlFor={`video-url-${idx}`}>
                            Video URL Link
                          </label>
                          <input
                            id={`video-url-${idx}`}
                            type="text"
                            value={video.src || ''}
                            onChange={(e) => {
                              const updated = [...(form.lookbookVideos || [])];
                              updated[idx] = { ...updated[idx], src: e.target.value };
                              handleChange('lookbookVideos', updated);
                            }}
                            placeholder="https://..."
                            className="form-input text-[11px] py-1.5 px-3"
                          />
                        </div>
                      )}

                      {/* Preset Select dropdown */}
                      {video.sourceMode === 'preset' && (
                        <div className="form-group">
                          <label className="form-label text-[11px]" htmlFor={`video-preset-${idx}`}>
                            Choose Preset Video
                          </label>
                          <select
                            id={`video-preset-${idx}`}
                            value={video.src || ''}
                            onChange={(e) => {
                              const updated = [...(form.lookbookVideos || [])];
                              updated[idx] = { ...updated[idx], src: e.target.value };
                              handleChange('lookbookVideos', updated);
                            }}
                            className="form-select text-[11px] py-1.5 px-2"
                          >
                            <option value="">-- Choose Preset --</option>
                            <option value="https://vjs.zencdn.net/v/oceans.mp4">Preset 1: Oceans Waves</option>
                            <option value="https://media.w3.org/2010/05/sintel/trailer_hd.mp4">Preset 2: Sintel Cinematic Trailer</option>
                            <option value="https://www.w3schools.com/html/mov_bbb.mp4">Preset 3: Big Buck Bunny</option>
                            <option value="https://www.w3schools.com/html/movie.mp4">Preset 4: Classic Canvas Film</option>
                          </select>
                        </div>
                      )}

                      {/* Local File Uploader */}
                      {video.sourceMode === 'upload' && (
                        <div className="form-group">
                          <label className="form-label text-[11px]" htmlFor={`video-file-${idx}`}>
                            Upload MP4 / WebM
                          </label>
                          <input
                            id={`video-file-${idx}`}
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const localUrl = URL.createObjectURL(file);
                                const updated = [...(form.lookbookVideos || [])];
                                updated[idx] = { ...updated[idx], src: localUrl, originalName: file.name };
                                handleChange('lookbookVideos', updated);
                                showToast(`Video Slot ${idx + 1} loaded locally! Preview on the right.`);
                              }
                            }}
                            className="form-input text-[11px] py-1 px-2 text-[10px]"
                          />
                          {video.originalName && (
                            <span className="text-[9px] text-on-surface-variant/70 mt-1 block truncate">
                              Loaded: {video.originalName}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Product Video Selector */}
                      {video.sourceMode === 'product' && (
                        <div className="form-group">
                          <label className="form-label text-[11px]" htmlFor={`video-product-${idx}`}>
                            Select Product
                          </label>
                          <select
                            id={`video-product-${idx}`}
                            value={video.selectedProductId || ''}
                            onChange={(e) => {
                              const prodId = e.target.value;
                              const prod = products.find((p) => p.id === prodId);
                              const firstVid = prod?.videos?.[0] || '';
                              const updated = [...(form.lookbookVideos || [])];
                              updated[idx] = {
                                ...updated[idx],
                                selectedProductId: prodId,
                                src: firstVid,
                              };
                              handleChange('lookbookVideos', updated);
                            }}
                            className="form-select text-[11px] py-1.5 px-2"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.map((p) => {
                              const hasVideo = productHasVideoMap[p.id] || false;
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name || p.title} {hasVideo ? '🎥' : '❌'}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Video list preview selector */}
                      {video.sourceMode === 'product' && video.selectedProductId && (
                        <div className="col-span-2 pt-2 border-t border-outline-variant/10 mt-1">
                          <label className="form-label text-[10px] mb-1 font-semibold block text-primary">
                            Attach Product Video Clip (Select one to preview &amp; bind)
                          </label>
                          <div className="flex gap-3 overflow-x-auto py-1.5">
                            {(products.find((p) => p.id === video.selectedProductId)?.videos || []).map((vidSrc, vidIdx) => {
                              const isActive = video.src === vidSrc;
                              return (
                                <div
                                  key={vidIdx}
                                  onClick={() => {
                                    const updated = [...(form.lookbookVideos || [])];
                                    updated[idx] = { ...updated[idx], src: vidSrc };
                                    handleChange('lookbookVideos', updated);
                                    showToast(`Attached Clip ${vidIdx + 1} from product video library!`);
                                  }}
                                  className={`flex-shrink-0 relative w-16 aspect-[9/16] rounded border cursor-pointer overflow-hidden transition-all shadow-sm ${
                                    isActive ? 'border-primary ring-2 ring-primary/20 scale-95' : 'border-outline-variant/40 opacity-75 hover:opacity-100'
                                  }`}
                                >
                                  <video src={vidSrc} className="w-full h-full object-cover" muted playsInline />
                                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                    {isActive ? (
                                      <span className="material-symbols-outlined text-white text-[16px] fill-icon">check_circle</span>
                                    ) : (
                                      <span className="material-symbols-outlined text-white text-[16px] opacity-0 hover:opacity-100">play_circle</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form actions */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="btn btn-secondary py-2.5 px-5 text-[11px]"
              >
                Reset Defaults
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary py-2.5 px-5 text-[11px]"
              >
                {isSaving ? 'Saving Configurations…' : 'Save Layout Configurations'}
              </button>
            </div>

          </form>

          {/* Right sidebar live previews */}
          <section className="flex flex-col gap-6">
            <div>
              <h2 className="admin-card-title">Live Viewport Preview</h2>
              <p className="admin-card-subtitle">Real-time simulation of layout customizations.</p>
            </div>

            {/* Toggle tabs for viewport */}
            <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant/35 w-full">
              <button
                type="button"
                onClick={() => setPreviewTab('listing')}
                className={`flex-1 text-center font-label-caps text-[10px] uppercase py-2 rounded-md transition-all ${
                  previewTab === 'listing' 
                    ? 'bg-surface shadow text-primary font-bold' 
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                Listing View
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('detail')}
                className={`flex-1 text-center font-label-caps text-[10px] uppercase py-2 rounded-md transition-all ${
                  previewTab === 'detail' 
                    ? 'bg-surface shadow text-primary font-bold' 
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                }`}
              >
                Detail View
              </button>
            </div>

            {/* Interactive Viewport Canvas */}
            <div 
              className={`p-6 rounded-2xl border border-outline-variant transition-all duration-300 relative min-h-[420px] flex items-center justify-center overflow-hidden shadow-inner ${
                form.themeMode === 'dark' || form.themeMode === 'midnight' ? 'dark' : ''
              }`}
              style={{
                backgroundColor: form.themeMode === 'dark' 
                  ? '#121212' 
                  : form.themeMode === 'midnight' 
                    ? '#030712' 
                    : form.storeBgColor,
                background: form.themeMode === 'light' ? form.backdropBg : 'none',
                backdropFilter: form.backdropFilter,
                color: form.themeMode === 'dark' || form.themeMode === 'midnight' ? '#f5f5f5' : '#1c1b1b',
              }}
            >
              {/* Blur backdrop indicator if backdropFilter is active */}
              {form.backdropFilter !== 'none' && (
                <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-20">
                  <span className="text-[10px] font-mono tracking-widest text-outline uppercase">
                    Backdrop Filter Active ({form.backdropFilter})
                  </span>
                </div>
              )}

              <div className="w-full relative z-10 max-w-[500px]">
                {previewTab === 'listing' ? (
                  /* Listing Card Preview */
                  <div className="flex flex-col gap-4 w-full">
                    <div 
                      className="grid gap-3 w-full"
                      style={{
                        gridTemplateColumns: `repeat(${form.gridCols || 4}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: form.gridCols || 4 }).map((_, i) => (
                        <div 
                          key={i}
                          className="flex flex-col transition-all duration-300 w-full shadow-md animate-fade-in"
                          style={{
                            borderRadius: form.borderRadius,
                            borderWidth: form.borderWidth,
                            borderColor: form.borderColor,
                            borderStyle: 'solid',
                            backgroundColor: form.themeMode === 'dark' 
                              ? '#1e1e1e' 
                              : form.themeMode === 'midnight' 
                                ? '#0b0f19' 
                                : 'var(--color-surface-container-lowest, #ffffff)',
                            overflow: 'hidden',
                          }}
                        >
                          <div 
                            className="preview-aspect-box"
                            style={{
                              aspectRatio: form.listingImgAspect,
                              borderRadius: '0px',
                              borderWidth: '0px',
                              minHeight: '40px',
                            }}
                          >
                            <span className="material-symbols-outlined text-outline-variant text-[14px]">image</span>
                          </div>
                          {form.gridCols <= 4 ? (
                            <div 
                              className="p-2 flex flex-col gap-0.5"
                              style={{
                                backgroundColor: form.themeMode === 'dark' 
                                  ? '#1e1e1e' 
                                  : form.themeMode === 'midnight' 
                                    ? '#0b0f19' 
                                    : 'var(--color-surface-container-lowest, #ffffff)',
                              }}
                            >
                              <span 
                                className="text-[7px] uppercase tracking-wider font-bold leading-none"
                                style={{ color: form.primaryColor || '#ac2471' }}
                              >
                                Category
                              </span>
                              <h4 
                                className="font-bold text-on-surface line-clamp-1 leading-none"
                                style={{ fontSize: `calc(${form.titleSizeListing} * 0.75)` }}
                              >
                                Sample Item
                              </h4>
                              <div 
                                className="font-bold text-on-surface mt-0.5"
                                style={{ fontSize: `calc(${form.priceSizeListing} * 0.75)` }}
                              >
                                ₹1,499
                              </div>
                            </div>
                          ) : (
                            <div className="p-1 flex flex-col bg-surface-container-lowest text-center">
                              <span className="font-bold text-on-surface text-[8px] leading-none">Item {i + 1}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Mini Lookbook Preview */}
                    <div className="border-t border-outline-variant/20 pt-4 mt-2">
                      <span className="text-[9px] uppercase tracking-wider font-semibold block mb-2 opacity-80">
                        Stories in Motion (Preview)
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-1 max-w-[480px]">
                        {(form.lookbookVideos || []).map((video, idx) => (
                          <div 
                            key={video.id || idx} 
                            className="flex-shrink-0 w-24 aspect-[9/16] rounded bg-surface-container-high border border-outline-variant/35 overflow-hidden relative shadow-sm"
                          >
                            {video.src ? (
                              <video 
                                src={video.src} 
                                className="w-full h-full object-cover" 
                                muted 
                                loop 
                                playsInline 
                                autoPlay
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[14px]">movie</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                              <span className="text-[6px] text-white line-clamp-1 font-bold">{video.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Details View Preview */
                  <div className="flex flex-col gap-4 max-w-[260px] mx-auto">
                    {/* Main image preview */}
                    <div 
                      className="preview-aspect-box shadow-sm"
                      style={{
                        aspectRatio: form.detailImgAspect,
                        borderRadius: form.borderRadius,
                        borderWidth: form.borderWidth,
                        borderColor: form.borderColor,
                        borderStyle: 'solid',
                      }}
                    >
                      <span className="material-symbols-outlined text-outline-variant text-3xl">image</span>
                    </div>

                    {/* Thumbnails preview */}
                    <div className="flex gap-2 justify-center">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="border flex items-center justify-center bg-surface-container"
                          style={{
                            width: form.galleryThumbW,
                            height: form.galleryThumbH,
                            borderRadius: form.borderRadiusSm,
                            borderColor: i === 0 ? (form.primaryColor || '#ac2471') : 'var(--color-outline-variant)',
                            boxShadow: i === 0 ? `0 0 0 2px ${(form.primaryColor || '#ac2471')}30` : 'none',
                          }}
                        >
                          <span className="material-symbols-outlined text-outline-variant text-[16px]">image</span>
                        </div>
                      ))}
                    </div>

                    {/* Typography Preview */}
                    <div 
                      className="space-y-2 border-t border-outline-variant/30 pt-3 backdrop-blur-md p-3 rounded-xl border"
                      style={{
                        backgroundColor: form.themeMode === 'dark' 
                          ? '#1e1e1e' 
                          : form.themeMode === 'midnight' 
                            ? '#0b0f19' 
                            : 'rgba(255, 255, 255, 0.7)',
                        borderColor: form.themeMode === 'dark' || form.themeMode === 'midnight' 
                          ? '#3a3a3a' 
                          : 'var(--color-outline-variant)',
                        color: form.themeMode === 'dark' || form.themeMode === 'midnight' ? '#f5f5f5' : '#1c1b1b',
                      }}
                    >
                      <h2 
                        className="font-bold leading-tight"
                        style={{ fontSize: form.titleSizeDetail }}
                      >
                        Detail Title Text
                      </h2>
                      <p 
                        className="leading-relaxed text-[13px] opacity-90"
                        style={{ fontSize: form.descSizeDetail }}
                      >
                        This text block displays how long product description paragraphs adjust in size to ensure optimal legibility and screen aesthetics.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
