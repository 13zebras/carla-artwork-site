// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteBeeAnimation } from '@/components/SiteBeeAnimation';
import { DEFAULT_BEE_SETTINGS } from '@/lib/shared/bee-settings';
import type { BeeSettings, BeeSettingsSnapshot } from '@/lib/shared/bee-settings';

const { load, renderedBee } = vi.hoisted(() => ({
  load: vi.fn<() => Promise<BeeSettingsSnapshot>>(),
  renderedBee: vi.fn<(settings: BeeSettings) => void>(),
}));
vi.mock('@/lib/functions/bee-settings.functions', () => ({ getPublishedBeeSettings: load }));
vi.mock('@/components/BeeAnimation', () => ({
  BeeAnimation: ({ settings }: { settings: BeeSettings }) => {
    renderedBee(settings);
    return <div data-testid='bee'>{settings.size}px</div>;
  },
}));

function snapshot(revision = 0, size = 20): BeeSettingsSnapshot {
  return { settings: { ...DEFAULT_BEE_SETTINGS, size }, revision };
}

function deferred() {
  let resolve: (value: BeeSettingsSnapshot) => void = () => {};
  const promise = new Promise<BeeSettingsSnapshot>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

let hidden = false;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  load.mockReset().mockResolvedValue(snapshot());
  renderedBee.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function flush() {
  await act(async () => {});
}

describe('published bee refresh', () => {
  it('updates separate visitors within 15 seconds and does not restart unchanged revisions', async () => {
    render(
      <>
        <SiteBeeAnimation initial={snapshot()} />
        <SiteBeeAnimation initial={snapshot()} />
      </>,
    );
    await flush();
    expect(screen.getAllByTestId('bee').map((bee) => bee.textContent)).toEqual(['20px', '20px']);
    renderedBee.mockClear();
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(renderedBee).not.toHaveBeenCalled();
    load.mockResolvedValue(snapshot(1, 48));
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(screen.getAllByTestId('bee').map((bee) => bee.textContent)).toEqual(['48px', '48px']);
  });

  it('skips hidden pages and checks on visibility return and focus', async () => {
    hidden = true;
    render(<SiteBeeAnimation initial={snapshot()} />);
    await act(() => vi.advanceTimersByTimeAsync(45_000));
    expect(load).not.toHaveBeenCalled();
    load.mockResolvedValue(snapshot(1, 16));
    hidden = false;
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByTestId('bee').textContent).toBe('16px');
    load.mockResolvedValue(snapshot(2, 48));
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(screen.getByTestId('bee').textContent).toBe('48px');
  });

  it('prevents overlapping requests and ignores responses older than route data', async () => {
    const request = deferred();
    load.mockReturnValue(request.promise);
    const { rerender } = render(<SiteBeeAnimation initial={snapshot()} />);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(load).toHaveBeenCalledOnce();
    rerender(<SiteBeeAnimation initial={snapshot(3, 48)} />);
    await act(async () => request.resolve(snapshot(2, 16)));
    expect(screen.getByTestId('bee').textContent).toBe('48px');
    // A stale loader response must not undo the newer revision either.
    rerender(<SiteBeeAnimation initial={snapshot(1, 20)} />);
    expect(screen.getByTestId('bee').textContent).toBe('48px');
  });

  it('retains working settings after a failure and retries normally', async () => {
    load.mockRejectedValueOnce(new Error('Offline'));
    render(<SiteBeeAnimation initial={snapshot()} />);
    await flush();
    expect(screen.getByTestId('bee').textContent).toBe('20px');
    load.mockResolvedValue(snapshot(1, 48));
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(screen.getByTestId('bee').textContent).toBe('48px');
  });

  it('cleans up timers/listeners and ignores obsolete Strict Mode responses', async () => {
    const obsolete = deferred();
    load.mockReturnValueOnce(obsolete.promise).mockResolvedValue(snapshot(1, 16));
    const { unmount } = render(
      <StrictMode>
        <SiteBeeAnimation initial={snapshot()} />
      </StrictMode>,
    );
    await flush();
    expect(screen.getByTestId('bee').textContent).toBe('16px');
    await act(async () => obsolete.resolve(snapshot(99, 48)));
    expect(screen.getByTestId('bee').textContent).toBe('16px');
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    load.mockClear();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(load).not.toHaveBeenCalled();
  });
});
