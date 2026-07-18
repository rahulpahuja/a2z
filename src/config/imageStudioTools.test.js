import { describe, it, expect } from 'vitest';
import { IMAGE_STUDIO_TOOLS, DEFAULT_IMAGE_STUDIO_TOOL_ID, getImageStudioTool } from './imageStudioTools.js';

describe('imageStudioTools config', () => {
  it('lists the four image tools moved out of the standalone admin nav', () => {
    const ids = IMAGE_STUDIO_TOOLS.map((tool) => tool.id);
    expect(ids).toEqual(['ai-studio', 'image-converter', 'watermark-studio', 'upload-test']);
  });

  it('gives every tool a unique id, a label, an icon, and a component', () => {
    const ids = new Set();
    IMAGE_STUDIO_TOOLS.forEach((tool) => {
      expect(ids.has(tool.id)).toBe(false);
      ids.add(tool.id);
      expect(typeof tool.label).toBe('string');
      expect(tool.label.length).toBeGreaterThan(0);
      expect(typeof tool.icon).toBe('string');
      expect(typeof tool.Component).toBe('function');
    });
  });

  it('defaults to the first configured tool', () => {
    expect(DEFAULT_IMAGE_STUDIO_TOOL_ID).toBe(IMAGE_STUDIO_TOOLS[0].id);
  });

  describe('getImageStudioTool', () => {
    it('resolves a known id to its tool descriptor', () => {
      expect(getImageStudioTool('image-converter').label).toBe('Image Converter');
    });

    it('falls back to the default tool for an unknown id', () => {
      expect(getImageStudioTool('not-a-real-tool')).toBe(IMAGE_STUDIO_TOOLS[0]);
    });

    it('falls back to the default tool when no id is given', () => {
      expect(getImageStudioTool(undefined)).toBe(IMAGE_STUDIO_TOOLS[0]);
      expect(getImageStudioTool(null)).toBe(IMAGE_STUDIO_TOOLS[0]);
    });
  });
});
