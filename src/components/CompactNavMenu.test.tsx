// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompactNavMenu } from '@/components/CompactNavMenu';

let pathname = '/';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, onClick, ...props }: React.ComponentProps<'a'> & { to: string }) => (
    <a
      href={to}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname } }),
}));

beforeEach(() => {
  pathname = '/';
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CompactNavMenu', () => {
  it('opens text links for About and Contact and closes after selecting a link', async () => {
    const { getByRole, queryByRole, container } = render(<CompactNavMenu />);
    const trigger = getByRole('button', { name: 'More pages' });

    expect(container.firstElementChild?.className).toContain('[@media(width<=370px)]:flex');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(queryByRole('link', { name: 'About' })).toBeNull();

    fireEvent.click(trigger);

    const about = await waitFor(() => getByRole('link', { name: 'About' }));
    const contact = getByRole('link', { name: 'Contact' });
    expect(about.getAttribute('href')).toBe('/about');
    expect(contact.getAttribute('href')).toBe('/contact');
    expect(contact.querySelector('svg')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(contact);
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
  });

  it('closes with Escape and returns focus to the hamburger', async () => {
    const { getByRole } = render(<CompactNavMenu />);
    const trigger = getByRole('button', { name: 'More pages' });
    fireEvent.click(trigger);

    const about = await waitFor(() => getByRole('link', { name: 'About' }));
    about.focus();
    fireEvent.keyDown(about, { key: 'Escape' });

    await waitFor(() => {
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    });
  });

  it.each([
    ['/about', 'About', 'Contact'],
    ['/contact', 'Contact', 'About'],
  ])('marks the current page on %s without a redundant link', async (path, active, other) => {
    pathname = path;
    const { getByRole, getByText, queryByRole } = render(<CompactNavMenu />);
    fireEvent.click(getByRole('button', { name: 'More pages' }));

    await waitFor(() => expect(getByText(active).getAttribute('aria-current')).toBe('page'));
    expect(queryByRole('link', { name: active })).toBeNull();
    expect(getByRole('link', { name: other })).toBeTruthy();
  });
});
