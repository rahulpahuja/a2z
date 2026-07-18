import { useState, useEffect } from 'react';
import { useStorefrontTheme, DEFAULT_THEME } from '../../context/StorefrontThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import './AdminConfiguratorPage.css';

export default function AdminConfiguratorPage() {
  const { theme, updateTheme, resetTheme, loading } = useStorefrontTheme();
  const { showToast } = useToast();

  // Local form states (initialized when theme loads)
  const [form, setForm] = useState(DEFAULT_THEME);
  const [isSaving, setIsSaving] = useState(false);

  // Diagnostic Test States
  const [diagStatus, setDiagStatus] = useState(null); // 'running', 'passed', 'failed'
  const [diagResults, setDiagResults] = useState([]);

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
      };

      // Apply test parameters
      await updateTheme(testParameters);

      // Assert state updated
      assert('Theme state is populated with test configs', () => {
        const root = document.documentElement;
        return root.style.getPropertyValue('--custom-listing-img-aspect') === '16/9' &&
               root.style.getPropertyValue('--custom-border-color') === '#ff0055';
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
              <h2 className="admin-card-title">Live Sizing Preview</h2>
              <p className="admin-card-subtitle">Real-time simulation of layout customizations.</p>
            </div>

            {/* Listing card preview */}
            <div className="admin-card flex flex-col gap-3">
              <span className="font-label-caps text-[9px] text-primary uppercase font-bold tracking-widest">
                Listing Card Preview
              </span>
              
              <div 
                className="flex flex-col border transition-all duration-300 w-full"
                style={{
                  borderRadius: form.borderRadius,
                  borderWidth: form.borderWidth,
                  borderColor: form.borderColor,
                  borderStyle: 'solid',
                  backgroundColor: form.backdropBg || '#ffffff',
                  backdropFilter: form.backdropFilter,
                  overflow: 'hidden',
                }}
              >
                <div 
                  className="preview-aspect-box"
                  style={{
                    aspectRatio: form.listingImgAspect,
                  }}
                >
                  <span className="material-symbols-outlined text-outline-variant text-3xl">image</span>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-primary font-bold">Category Name</span>
                  <h4 
                    className="font-bold text-on-surface line-clamp-1 leading-snug"
                    style={{ fontSize: form.titleSizeListing }}
                  >
                    Sample Product Name
                  </h4>
                  <p 
                    className="text-on-surface-variant line-clamp-1 leading-normal"
                    style={{ fontSize: form.descSizeListing }}
                  >
                    Short descriptive sample sentence representing design scale.
                  </p>
                  <div 
                    className="font-bold text-on-surface mt-1"
                    style={{ fontSize: form.priceSizeListing }}
                  >
                    ₹1,499.00
                  </div>
                </div>
              </div>
            </div>

            {/* Details page elements preview */}
            <div className="admin-card flex flex-col gap-4">
              <span className="font-label-caps text-[9px] text-primary uppercase font-bold tracking-widest">
                Detail View Preview
              </span>

              {/* Main image preview */}
              <div 
                className="preview-aspect-box"
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
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`border ${i === 0 ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant'} flex items-center justify-center bg-surface-container`}
                    style={{
                      width: form.galleryThumbW,
                      height: form.galleryThumbH,
                      borderRadius: form.borderRadiusSm,
                    }}
                  >
                    <span className="material-symbols-outlined text-outline-variant text-[16px]">image</span>
                  </div>
                ))}
              </div>

              {/* Typography Preview */}
              <div className="space-y-2 border-t border-outline-variant/30 pt-4">
                <h2 
                  className="font-bold text-on-surface leading-tight"
                  style={{ fontSize: form.titleSizeDetail }}
                >
                  Detail Title Text
                </h2>
                <p 
                  className="text-on-surface-variant leading-relaxed"
                  style={{ fontSize: form.descSizeDetail }}
                >
                  This text block displays how long product description paragraphs adjust in size to ensure optimal legibility and screen aesthetics.
                </p>
              </div>
            </div>

          </section>

        </div>
      </main>
    </div>
  );
}
