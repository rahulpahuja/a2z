import { useSearchParams } from 'react-router-dom';
import {
  IMAGE_STUDIO_TOOLS,
  DEFAULT_IMAGE_STUDIO_TOOL_ID,
  getImageStudioTool,
} from '../../config/imageStudioTools.js';

export default function ImageStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTool = getImageStudioTool(searchParams.get('tool'));
  const ActiveComponent = activeTool.Component;

  const selectTool = (id) => {
    setSearchParams(id === DEFAULT_IMAGE_STUDIO_TOOL_ID ? {} : { tool: id });
  };

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <h1 className="admin-page-title">Image Studio</h1>
        <p className="admin-page-subtitle">
          Every image tool for your catalog — AI backgrounds, format conversion, watermarking, and upload
          diagnostics — in one place.
        </p>
      </header>

      <div className="admin-main-container !pb-0">
        <div
          role="tablist"
          aria-label="Image Studio tools"
          className="flex gap-2 overflow-x-auto hide-scrollbar pb-6 -mx-1 px-1"
        >
          {IMAGE_STUDIO_TOOLS.map((tool) => {
            const isActive = tool.id === activeTool.id;
            return (
              <button
                key={tool.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectTool(tool.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full font-label-caps text-label-caps whitespace-nowrap uppercase transition-colors border ${
                  isActive
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tool.icon}</span>
                {tool.label}
              </button>
            );
          })}
        </div>
      </div>

      <ActiveComponent />
    </div>
  );
}
