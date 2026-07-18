import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ImageStudioPage from './ImageStudioPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import { IMAGE_STUDIO_TOOLS } from '../../config/imageStudioTools.js';

function renderImageStudio(initialEntries = ['/super/image-studio']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <ImageStudioPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ImageStudioPage', () => {
  it('renders one tab per configured tool', () => {
    renderImageStudio();
    IMAGE_STUDIO_TOOLS.forEach((tool) => {
      expect(screen.getByRole('tab', { name: new RegExp(tool.label) })).toBeInTheDocument();
    });
  });

  it('shows the first tool by default with its tab marked selected', () => {
    renderImageStudio();
    const [defaultTool, ...otherTools] = IMAGE_STUDIO_TOOLS;

    expect(screen.getByRole('heading', { name: new RegExp(defaultTool.label) })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(defaultTool.label) })).toHaveAttribute('aria-selected', 'true');

    otherTools.forEach((tool) => {
      expect(screen.queryByRole('heading', { name: new RegExp(tool.label) })).not.toBeInTheDocument();
    });
  });

  it('switches to the clicked tool and unmounts the previous one', async () => {
    const user = userEvent.setup();
    renderImageStudio();
    const [firstTool, secondTool] = IMAGE_STUDIO_TOOLS;

    await user.click(screen.getByRole('tab', { name: new RegExp(secondTool.label) }));

    expect(screen.getByRole('heading', { name: new RegExp(secondTool.label) })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: new RegExp(firstTool.label) })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(secondTool.label) })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: new RegExp(firstTool.label) })).toHaveAttribute('aria-selected', 'false');
  });

  it('opens the tool requested via the ?tool= deep link', () => {
    const target = IMAGE_STUDIO_TOOLS[2];
    renderImageStudio([`/super/image-studio?tool=${target.id}`]);

    expect(screen.getByRole('heading', { name: new RegExp(target.label) })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(target.label) })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to the default tool for an unrecognized ?tool= value', () => {
    renderImageStudio(['/super/image-studio?tool=does-not-exist']);

    expect(
      screen.getByRole('heading', { name: new RegExp(IMAGE_STUDIO_TOOLS[0].label) })
    ).toBeInTheDocument();
  });
});
