// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
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
    expect(header?.className).toContain('duration-100');

    contentTop = 99;
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(header?.className).toContain('bg-background/80');
    expect(header?.className).toContain('backdrop-blur-[3px]');

    contentTop = -200;
    contentBottom = 0;
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(header?.className).toContain('bg-background/10');
    expect(header?.className).toContain('backdrop-blur-[0px]');

    contentTop = 100;
    contentBottom = 1000;
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(header?.className).toContain('bg-background/10');

    headerBottom = 150;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(header?.className).toContain('bg-background/80');
  });

  it('resets when navigating away from a portfolio', () => {
    contentTop = 50;
    const { container, rerender } = render(<Header />);
    const header = container.querySelector('[data-site-header]');
    expect(header?.className).toContain('bg-background/80');

    content.remove();
    pathname = '/about';
    rerender(<Header />);
    expect(header?.className).toContain('bg-background/10');
    expect(header?.className).toContain('backdrop-blur-[0px]');
  });
});
