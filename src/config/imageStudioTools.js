import AIStudioPage from '../pages/AIStudioPage.jsx';
import AdminImageConverterPage from '../pages/admin/AdminImageConverterPage.jsx';
import AdminWatermarkPage from '../pages/admin/AdminWatermarkPage.jsx';
import AdminUploadTestPage from '../pages/admin/AdminUploadTestPage.jsx';

// Single source of truth for which tools live inside the Image Studio pane.
// Adding a tool here is the only change needed to surface it as a new tab —
// ImageStudioPage never needs to know about individual tools.
export const IMAGE_STUDIO_TOOLS = [
  {
    id: 'ai-studio',
    label: 'AI Background Studio',
    icon: 'auto_awesome',
    description: 'Remove backgrounds and generate AI backdrops for product photos.',
    Component: AIStudioPage,
  },
  {
    id: 'image-converter',
    label: 'Image Converter',
    icon: 'image',
    description: 'Compress and convert PNG, JPEG, and HEIC assets to WebP.',
    Component: AdminImageConverterPage,
  },
  {
    id: 'watermark-studio',
    label: 'Watermark Studio',
    icon: 'auto_fix',
    description: 'Remove existing watermarks or add your own text/logo watermark.',
    Component: AdminWatermarkPage,
  },
  {
    id: 'upload-test',
    label: 'R2 Upload Test',
    icon: 'cloud_upload',
    description: 'Diagnose the Cloudflare R2 image upload pipeline.',
    Component: AdminUploadTestPage,
  },
];

export const DEFAULT_IMAGE_STUDIO_TOOL_ID = IMAGE_STUDIO_TOOLS[0].id;

export function getImageStudioTool(id) {
  return IMAGE_STUDIO_TOOLS.find((tool) => tool.id === id) ?? IMAGE_STUDIO_TOOLS[0];
}
