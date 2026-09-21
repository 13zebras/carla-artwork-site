// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { BeeAnimation } from '@/components/BeeAnimation';
import * as beePaths from '@/lib/shared/bee-animation';
import * as beeVelocity from '@/lib/shared/bee-velocity';

let now: number;
let nextFrameId: number;
let frames: Map<number, FrameRequestCallback>;
let mediaEvents: EventTarget;
let preference: {
  matches: boolean;
  addEventListener: Mock<EventTarget['addEventListener']>;
  removeEventListener: Mock<EventTarget['removeEventListener']>;
};
let resize: () => void;
let disconnect: Mock<ResizeObserver['disconnect']>;
let observe: Mock<ResizeObserver['observe']>;
let context: {
  clearRect: Mock<CanvasRenderingContext2D['clearRect']>;
  setTransform: Mock<CanvasRenderingContext2D['setTransform']>;
  beginPath: Mock<CanvasRenderingContext2D['beginPath']>;
  moveTo: Mock<CanvasRenderingContext2D['moveTo']>;
  lineTo: Mock<CanvasRenderingContext2D['lineTo']>;
  stroke: Mock<CanvasRenderingContext2D['stroke']>;
  globalAlpha: number;
  lineCap: CanvasLineCap;
};

function advanceFrame(time: number) {
  now = time;
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(now)));
}

function setReducedMotion(matches: boolean) {
  preference.matches = matches;
  act(() => mediaEvents.dispatchEvent(new Event('change')));
}

beforeEach(() => {
  now = 0;
  nextFrameId = 0;
  frames = new Map();
  mediaEvents = new EventTarget();
  preference = {
    matches: false,
    addEventListener: vi.fn<EventTarget['addEventListener']>(
      mediaEvents.addEventListener.bind(mediaEvents),
    ),
    removeEventListener: vi.fn<EventTarget['removeEventListener']>(
      mediaEvents.removeEventListener.bind(mediaEvents),
    ),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => preference),
  );
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrameId, callback);
      return nextFrameId;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id)),
  );
  vi.stubGlobal('devicePixelRatio', 2);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 176,
    top: 176,
    left: 0,
    right: 1000,
    bottom: 776,
    width: 1000,
    height: 600,
    toJSON: () => ({}),
  });
  disconnect = vi.fn<ResizeObserver['disconnect']>();
  observe = vi.fn<ResizeObserver['observe']>();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = observe;
      disconnect = disconnect;
    },
  );
  context = {
    clearRect: vi.fn<CanvasRenderingContext2D['clearRect']>(),
    setTransform: vi.fn<CanvasRenderingContext2D['setTransform']>(),
    beginPath: vi.fn<CanvasRenderingContext2D['beginPath']>(),
    moveTo: vi.fn<CanvasRenderingContext2D['moveTo']>(),
    lineTo: vi.fn<CanvasRenderingContext2D['lineTo']>(),
    stroke: vi.fn<CanvasRenderingContext2D['stroke']>(),
    globalAlpha: 1,
    lineCap: 'round',
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BeeAnimation', () => {
  it('does not initialize canvas or schedule motion with reduced motion enabled', () => {
    preference.matches = true;
    const { container } = render(<BeeAnimation />);
    expect(frames.size).toBe(0);
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(container.firstElementChild?.classList.contains('invisible')).toBe(true);
  });

  it('moves the bee and draws a high-DPI trail without intercepting interaction', () => {
    const { container } = render(<BeeAnimation />);
    const viewport = container.firstElementChild as HTMLDivElement;
    const bee = viewport.lastElementChild as HTMLDivElement;
    const canvas = viewport.querySelector('canvas') as HTMLCanvasElement;
    expect(viewport.classList.contains('fixed')).toBe(true);
    expect(viewport.classList.contains('pointer-events-none')).toBe(true);
    expect(viewport.classList.contains('-z-10')).toBe(true);
    expect(canvas.width).toBe(2000);
    expect(canvas.height).toBe(1200);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    advanceFrame(0);
    const initialTransform = bee.style.transform;
    advanceFrame(100);
    expect(viewport.style.visibility).toBe('visible');
    expect(bee.style.transform).not.toBe(initialTransform);
    expect(context.stroke).toHaveBeenCalled();
    expect(frames.size).toBe(1);
  });

  it('fades the bee and trail in over the first second without restarting on resize', () => {
    const { container } = render(<BeeAnimation />);
    const viewport = container.firstElementChild as HTMLDivElement;
    expect(viewport.classList.contains('opacity-0')).toBe(true);
    advanceFrame(100);
    expect(viewport.style.opacity).toBe('0');
    advanceFrame(600);
    expect(viewport.style.opacity).toBe('0.5');
    act(() => resize());
    advanceFrame(1100);
    expect(viewport.style.opacity).toBe('1');
    advanceFrame(2100);
    expect(viewport.style.opacity).toBe('1');
  });

  it('uses flat trail caps so adjacent segments do not extend past shared endpoints', () => {
    render(<BeeAnimation />);
    advanceFrame(0);
    advanceFrame(100);
    expect(context.stroke).toHaveBeenCalled();
    expect(context.lineCap).toBe('butt');
  });

  it('carries velocity and leftover distance into fresh routes of different lengths', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const stepper = vi
      .spyOn(beeVelocity, 'createBeeDistanceStepper')
      .mockReturnValue((deltaMs) => deltaMs / 10); // Constant 100 CSS px/s.
    const buildPath = vi.spyOn(beePaths, 'createBeeFlightPath');
    const getPosition = vi.spyOn(beePaths, 'getBeePosition');
    render(<BeeAnimation />);
    const firstPath = buildPath.mock.results[0].value as beePaths.BeeFlightPath;
    const firstLength = firstPath.crossings[1].length;
    advanceFrame(0);
    advanceFrame((firstLength - 0.1) * 10);
    expect(buildPath).toHaveBeenCalledTimes(1);
    const before = context.lineTo.mock.lastCall;

    random.mockReturnValue(0.1);
    advanceFrame((firstLength + 0.1) * 10);
    const after = context.lineTo.mock.lastCall;
    expect(buildPath).toHaveBeenCalledTimes(2);
    if (!before || !after) throw new Error('Expected trail coordinates around the turn');
    expect(Math.hypot(after[0] - before[0], after[1] - before[1])).toBeCloseTo(0.2, 3);
    const secondPath = buildPath.mock.results[1].value as beePaths.BeeFlightPath;
    const secondLength = secondPath.crossings[-1].length;
    expect(secondLength).not.toBeCloseTo(firstLength);
    expect(getPosition.mock.calls.at(-2)?.[0]).toBeCloseTo((1 + 0.1 / secondLength) / 2, 10);

    // A delayed frame can cross more than one complete route. With the same
    // random seed, subsequent routes have the same length as the second.
    advanceFrame((firstLength + 2 * secondLength + 25) * 10);
    expect(buildPath).toHaveBeenCalledTimes(4);
    expect(getPosition.mock.calls.at(-2)?.[0]).toBeCloseTo((1 + 25 / secondLength) / 2, 10);
    expect(stepper).toHaveBeenCalledTimes(1);
  });

  it('preserves fractional progress and the velocity transition on resize', () => {
    const stepper = vi
      .spyOn(beeVelocity, 'createBeeDistanceStepper')
      .mockReturnValue((deltaMs) => deltaMs / 10);
    const getPosition = vi.spyOn(beePaths, 'getBeePosition');
    render(<BeeAnimation />);
    advanceFrame(0);
    advanceFrame(1000);
    const before = getPosition.mock.calls.at(-2)?.[0];
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 176, 500, 600),
    );
    act(() => resize());
    advanceFrame(1000);
    expect(getPosition.mock.calls.at(-2)?.[0]).toBeCloseTo(before ?? NaN, 10);
    expect(stepper).toHaveBeenCalledTimes(1);
  });

  it('does not loop or accumulate travel while the viewport is collapsed', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 0, 0),
    );
    const buildPath = vi.spyOn(beePaths, 'createBeeFlightPath');
    const getPosition = vi.spyOn(beePaths, 'getBeePosition');
    render(<BeeAnimation />);
    advanceFrame(0);
    advanceFrame(60_000);
    expect(buildPath).toHaveBeenCalledTimes(1);
    expect(getPosition.mock.calls.at(-2)?.[0]).toBe(0);
    expect(frames.size).toBe(1);
  });

  it('measures and observes the actual header bottom as the top of the flight area', () => {
    vi.stubGlobal('innerHeight', 1000);
    let headerHeight = 220;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        if (this.hasAttribute('data-site-header')) return new DOMRect(0, 0, 1000, headerHeight);
        const top = Number.parseFloat(this.style.top) || 0;
        return new DOMRect(0, top, 1000, 1000 - top);
      },
    );
    const { container } = render(
      <div>
        <header data-site-header />
        <BeeAnimation />
      </div>,
    );
    const viewport = container.querySelector('.bee-animation') as HTMLDivElement;
    const canvas = viewport.querySelector('canvas') as HTMLCanvasElement;
    expect(observe).toHaveBeenCalledWith(container.querySelector('header'));
    expect(viewport.style.top).toBe('220px');
    expect(canvas.height).toBe(1560);

    headerHeight = 160;
    act(() => resize());
    expect(viewport.style.top).toBe('160px');
    expect(canvas.height).toBe(1680);
  });

  it('stops, clears, and hides immediately when the motion preference changes', () => {
    const { container } = render(<BeeAnimation />);
    const viewport = container.firstElementChild as HTMLDivElement;
    advanceFrame(0);
    context.clearRect.mockClear();
    setReducedMotion(true);
    expect(frames.size).toBe(0);
    expect(viewport.style.visibility).toBe('hidden');
    expect(context.clearRect).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
    setReducedMotion(false);
    expect(frames.size).toBe(1);
    advanceFrame(100);
    expect(viewport.style.visibility).toBe('visible');
  });

  it('pauses in hidden tabs, expires old trails, and resumes without jumping', () => {
    const { container } = render(<BeeAnimation />);
    const viewport = container.firstElementChild as HTMLDivElement;
    const bee = viewport.lastElementChild as HTMLDivElement;
    advanceFrame(0);
    advanceFrame(100);
    const beforePause = bee.style.transform;
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(frames.size).toBe(0);
    now = 60_000;
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    context.moveTo.mockClear();
    advanceFrame(60_000);
    expect(bee.style.transform).toBe(beforePause);
    expect(viewport.style.opacity).toBe('0.1');
    // Only the new head remains; no connecting line to the expired trail.
    expect(context.moveTo).toHaveBeenCalledTimes(1);
  });

  it('restarts the trail after resizing', () => {
    render(<BeeAnimation />);
    advanceFrame(0);
    advanceFrame(100);
    advanceFrame(200);
    act(() => resize());
    context.moveTo.mockClear();
    advanceFrame(300);
    expect(context.moveTo).toHaveBeenCalledTimes(1);
  });

  it('cleans up frames and listeners, including Strict Mode remounts', () => {
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <StrictMode>
        <BeeAnimation />
      </StrictMode>,
    );
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(preference.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    setReducedMotion(false);
    expect(frames.size).toBe(0);
  });
});
