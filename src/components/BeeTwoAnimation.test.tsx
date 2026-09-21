// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BeeTwoAnimation } from '@/components/BeeTwoAnimation';

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let hidden: boolean;
let headerHeight: number;
let header: HTMLElement;
let media: MediaQueryList;
let resizeObservers: {
  callback: ResizeObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}[];
let context: {
  clearRect: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  globalAlpha: number;
};

function tick(milliseconds: number) {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(milliseconds);
  });
}

function setReducedMotion(matches: boolean) {
  act(() => {
    Object.defineProperty(media, 'matches', { configurable: true, value: matches });
    media.dispatchEvent(new Event('change'));
  });
}

beforeEach(() => {
  frames = new Map();
  nextFrame = 0;
  hidden = false;
  headerHeight = 160;
  resizeObservers = [];
  context = {
    clearRect: vi.fn<CanvasRenderingContext2D['clearRect']>(),
    setTransform: vi.fn<CanvasRenderingContext2D['setTransform']>(),
    beginPath: vi.fn<CanvasRenderingContext2D['beginPath']>(),
    moveTo: vi.fn<CanvasRenderingContext2D['moveTo']>(),
    lineTo: vi.fn<CanvasRenderingContext2D['lineTo']>(),
    stroke: vi.fn<CanvasRenderingContext2D['stroke']>(),
    globalAlpha: 1,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(12);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(12);
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.stubGlobal('innerWidth', 1000);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('devicePixelRatio', 2);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id)),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn<ResizeObserver['observe']>();
      disconnect = vi.fn<ResizeObserver['disconnect']>();
      constructor(public callback: ResizeObserverCallback) {
        resizeObservers.push(this);
      }
    },
  );
  media = new EventTarget() as MediaQueryList;
  Object.defineProperty(media, 'matches', { configurable: true, value: false });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
  header = document.createElement('header');
  header.setAttribute('data-site-header', '');
  vi.spyOn(header, 'getBoundingClientRect').mockImplementation(
    () => ({ height: headerHeight }) as DOMRect,
  );
  document.body.append(header);
});

afterEach(() => {
  cleanup();
  header.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BeeTwoAnimation', () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])('keeps stacking (%s) independent from full viewport (%s)', (aboveContent, fullViewport) => {
    const { container } = render(
      <BeeTwoAnimation aboveContent={aboveContent} fullViewport={fullViewport} />,
    );
    const wrapper = container.firstElementChild as HTMLDivElement;
    const canvas = wrapper.querySelector('canvas') as HTMLCanvasElement;
    expect(wrapper.classList.contains(aboveContent ? 'z-30' : '-z-10')).toBe(true);
    expect(wrapper.classList.contains('pointer-events-none')).toBe(true);
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.style.top).toBe(fullViewport ? '0px' : '160px');
    expect(canvas.width).toBe(2000);
    expect(canvas.height).toBe(fullViewport ? 1600 : 1280);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(resizeObservers[0].observe.mock.calls.length).toBe(fullViewport ? 0 : 1);
  });

  it('fades in gradually and draws a trail without per-frame renders', () => {
    const { container } = render(<BeeTwoAnimation />);
    const bee = container.querySelector('canvas + div') as HTMLDivElement;
    tick(0);
    expect(bee.style.opacity).toBe('0');
    const initialTransform = bee.style.transform;
    for (let time = 100; time <= 1200; time += 100) tick(time);
    expect(Number(bee.style.opacity)).toBeGreaterThan(0);
    expect(Number(bee.style.opacity)).toBeLessThan(1);
    expect(bee.style.transform).not.toBe(initialTransform);
    expect(context.stroke).toHaveBeenCalled();
    for (let time = 1300; time <= 2600; time += 100) tick(time);
    expect(bee.style.opacity).toBe('1');
    expect(frames.size).toBe(1);
  });

  it('recalculates the container after header and viewport changes', () => {
    const { container } = render(<BeeTwoAnimation />);
    const wrapper = container.firstElementChild as HTMLDivElement;
    const canvas = wrapper.querySelector('canvas') as HTMLCanvasElement;
    headerHeight = 200;
    act(() => resizeObservers[0].callback([], resizeObservers[0] as unknown as ResizeObserver));
    expect(wrapper.style.top).toBe('200px');
    expect(canvas.height).toBe(1200);
    vi.stubGlobal('innerHeight', 900);
    act(() => window.dispatchEvent(new Event('resize')));
    expect(canvas.height).toBe(1400);
    expect(frames.size).toBe(1);
  });

  it('does not animate with reduced motion and responds to preference changes', () => {
    setReducedMotion(true);
    const { container } = render(<BeeTwoAnimation />);
    const wrapper = container.firstElementChild as HTMLDivElement;
    expect(frames.size).toBe(0);
    expect(wrapper.style.visibility).toBe('hidden');
    setReducedMotion(false);
    expect(frames.size).toBe(1);
    expect(wrapper.style.visibility).toBe('visible');
    setReducedMotion(true);
    expect(frames.size).toBe(0);
    expect(wrapper.style.visibility).toBe('hidden');
  });

  it('pauses hidden tabs and removes old trail segments without jumping on resume', () => {
    const { container } = render(<BeeTwoAnimation />);
    const bee = container.querySelector('canvas + div') as HTMLDivElement;
    for (let time = 0; time <= 3000; time += 100) tick(time);
    const previousTransform = bee.style.transform;
    act(() => {
      hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(frames.size).toBe(0);
    act(() => {
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    context.stroke.mockClear();
    tick(25000);
    expect(bee.style.transform).toBe(previousTransform);
    expect(context.stroke).not.toHaveBeenCalled();
    tick(25100);
    expect(bee.style.transform).not.toBe(previousTransform);
    expect(context.stroke).toHaveBeenCalledTimes(1);
  });

  it('cleans up frames and listeners, including Strict Mode setup/cleanup', () => {
    const { unmount } = render(
      <StrictMode>
        <BeeTwoAnimation />
      </StrictMode>,
    );
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(resizeObservers.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(
      true,
    );
    act(() => {
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new Event('visibilitychange'));
      media.dispatchEvent(new Event('change'));
    });
    expect(frames.size).toBe(0);
  });
});
