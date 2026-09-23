// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '@/components/Header';

let pathname = '/';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: React.ComponentProps<'a'> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLoaderData: () => ({ categories: [], railwayEnvironmentName: '' }),
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname } }),
}));
vi.mock('@/components/ArtworkNavMenu', () => ({ ArtworkNavMenu: () => null }));
vi.mock('@/components/ThemeToggle', () => ({ ThemeToggle: () => null }));

let headerBottom: number;
let contentTop: number;
let contentBottom: number;
let content: HTMLDivElement;

beforeEach(() => {
  pathname = '/';
  headerBottom = 100;
  contentTop = 150;
  contentBottom = 1000;
  content = document.createElement('div');
  content.setAttribute('data-portfolio-content', '');
  document.body.append(content);

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      if (this.hasAttribute('data-site-header')) {
        return { top: 0, bottom: headerBottom } as DOMRect;
      }
      return { top: contentTop, bottom: contentBottom } as DOMRect;
    },
  );
});

afterEach(() => {
  cleanup();
  content.remove();
  vi.restoreAllMocks();
});

describe('Header portfolio overlap', () => {
  it('changes background and blur only while portfolio content overlaps the header', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('[data-site-header]');

    expect(header?.className).toContain('bg-background/10');
    expect(header?.className).toContain('backdrop-blur-[0px]');
    expect(header?.className).toContain('duration-200');
    expect(header?.className).toContain('data-[portfolio-behind]:bg-background/80');
    expect(header?.className).toContain('data-[portfolio-behind]:backdrop-blur-[3px]');
    expect(header?.hasAttribute('data-portfolio-behind')).toBe(false);

    contentTop = 99;
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(header?.hasAttribute('data-portfolio-behind')).toBe(true);

    contentTop = -200;
    contentBottom = 0;
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(header?.hasAttribute('data-portfolio-behind')).toBe(false);

    contentTop = 100;
    contentBottom = 1000;
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(header?.hasAttribute('data-portfolio-behind')).toBe(false);

    headerBottom = 150;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(header?.hasAttribute('data-portfolio-behind')).toBe(true);
  });

  it('resets when navigating away from a portfolio', () => {
    contentTop = 50;
    const { container, rerender } = render(<Header />);
    const header = container.querySelector('[data-site-header]');
    expect(header?.hasAttribute('data-portfolio-behind')).toBe(true);

    content.remove();
    pathname = '/about';
    rerender(<Header />);
    expect(header?.hasAttribute('data-portfolio-behind')).toBe(false);

    act(() => window.dispatchEvent(new Event('scroll')));
    expect(header?.hasAttribute('data-portfolio-behind')).toBe(false);
  });

  it('updates synchronously without React commits or redundant attribute writes', () => {
    const onRender = vi.fn<ProfilerOnRenderCallback>();
    const { getByRole } = render(
      <Profiler id='header' onRender={onRender}>
        <Header />
      </Profiler>,
    );
    const header = getByRole('banner');
    const toggleAttribute = vi.spyOn(header, 'toggleAttribute');
    onRender.mockClear();

    contentTop = 99;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      expect(header.hasAttribute('data-portfolio-behind')).toBe(true);
    });

    contentTop = 50;
    act(() => window.dispatchEvent(new Event('scroll')));
    act(() => window.dispatchEvent(new Event('resize')));

    expect(toggleAttribute).toHaveBeenCalledTimes(1);
    expect(onRender).not.toHaveBeenCalled();
  });

  it('removes the attribute and listeners on unmount', () => {
    contentTop = 50;
    const { getByRole, unmount } = render(<Header />);
    const header = getByRole('banner');
    expect(header.hasAttribute('data-portfolio-behind')).toBe(true);

    unmount();
    expect(header.hasAttribute('data-portfolio-behind')).toBe(false);

    const toggleAttribute = vi.spyOn(header, 'toggleAttribute');
    act(() => window.dispatchEvent(new Event('scroll')));
    act(() => window.dispatchEvent(new Event('resize')));
    expect(toggleAttribute).not.toHaveBeenCalled();
  });
});
