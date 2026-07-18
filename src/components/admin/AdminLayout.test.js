import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from './AdminLayout.jsx';

const RETIRED_STANDALONE_LABELS = ['AI Studio', 'Image Converter', 'Watermark Remover', 'R2 Upload Test'];

describe('AdminLayout nav items', () => {
  it('exposes exactly one Image Studio entry pointing at the consolidated pane', () => {
    const imageStudioEntries = NAV_ITEMS.filter((item) => item.to === '/super/image-studio');
    expect(imageStudioEntries).toHaveLength(1);
    expect(imageStudioEntries[0].label).toBe('Image Studio');
  });

  it('no longer lists the individual image tools as their own nav entries', () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    RETIRED_STANDALONE_LABELS.forEach((label) => {
      expect(labels).not.toContain(label);
    });
  });

  it('does not route any remaining nav entry to a retired standalone tool path', () => {
    const retiredPaths = ['/super/ai-studio', '/super/image-converter', '/super/watermark-remover', '/super/upload-test'];
    const paths = NAV_ITEMS.map((item) => item.to);
    retiredPaths.forEach((path) => {
      expect(paths).not.toContain(path);
    });
  });
});
