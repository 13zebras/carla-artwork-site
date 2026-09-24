// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BeeTwoAnimation } from '@/components/BeeTwoAnimation';
import { DEFAULT_BEE_SETTINGS } from '@/lib/shared/bee-settings';
import * as beeTwoGeometry from '@/lib/shared/bee-two-animation';

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
  ])(
    'uses unrestricted full-viewport flight above content (%s, full=%s)',
    (aboveContent, fullViewport) => {
      const createFlight = vi.spyOn(beeTwoGeometry, 'createBeeTwoFlight');
      const usesFullViewport = aboveContent || fullViewport;
      const { container } = render(
        <BeeTwoAnimation aboveContent={aboveContent} fullViewport={fullViewport} />,
      );
      const wrapper = container.firstElementChild as HTMLDivElement;
      const canvas = wrapper.querySelector('canvas') as HTMLCanvasElement;
      expect(wrapper.classList.contains(aboveContent ? 'z-30' : '-z-10')).toBe(true);
      expect(wrapper.classList.contains('pointer-events-none')).toBe(true);
      expect(wrapper.getAttribute('aria-hidden')).toBe('true');
      expect(wrapper.style.top).toBe(usesFullViewport ? '0px' : '160px');
      expect(canvas.width).toBe(2000);
      expect(canvas.height).toBe(usesFullViewport ? 1600 : 1280);
      expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
      expect(resizeObservers[0].observe.mock.calls.length).toBe(usesFullViewport ? 0 : 1);
      expect(createFlight).toHaveBeenCalledWith(
        { width: 1000, height: usesFullViewport ? 800 : 640, top: usesFullViewport ? 0 : 160 },
        expect.objectContaining({
          excludeCenter: !aboveContent,
          maxQuadrantSeconds: 7,
          minTurnDegrees: 40,
          maxTurnDegrees: 60,
        }),
      );
    },
  );

  it.each([
    [559, 'compact', 0.12],
    [560, 'wide', 0.06],
    [561, 'wide', 0.06],
  ] as const)('launches at the %s px logo position (%s)', (width, logoType, horizontalRatio) => {
    const wideLogo = document.createElement('img');
    wideLogo.dataset.beeLogo = 'wide';
    const compactLogo = document.createElement('img');
    compactLogo.dataset.beeLogo = 'compact';
    header.append(wideLogo, compactLogo);
    let logoLeft = 80;
    const logoTop = 20;
    const logoWidth = 300;
    const logoHeight = 70;
    const chosenLogo = logoType === 'wide' ? wideLogo : compactLogo;
    vi.spyOn(chosenLogo, 'getBoundingClientRect').mockImplementation(
      () => ({ left: logoLeft, top: logoTop, width: logoWidth, height: logoHeight }) as DOMRect,
    );
    vi.stubGlobal('innerWidth', width);
    const createFlight = vi.spyOn(beeTwoGeometry, 'createBeeTwoFlight');
    const { container } = render(<BeeTwoAnimation />);
    const start = { x: logoLeft + logoWidth * horizontalRatio, y: logoTop + logoHeight / 2 };
    expect(createFlight).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ initialPoint: start }),
    );
    const bee = container.querySelector('canvas + div') as HTMLDivElement;
    tick(0);
    expect(bee.style.transform).toContain(`translate(${start.x}px, ${start.y}px)`);

    logoLeft += 25;
    act(() => resizeObservers[0].callback([], resizeObservers[0] as unknown as ResizeObserver));
    expect(createFlight).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ initialPoint: { ...start, x: start.x + 25 } }),
    );
    tick(100);
    expect(bee.style.transform).toContain(`translate(${start.x + 25}px, ${start.y}px)`);
  });

  it('advances the quadrant clock with active frame time, not hidden-tab time', () => {
    const advance = vi.fn<
      NonNullable<ReturnType<typeof beeTwoGeometry.createBeeTwoFlight>>['advance']
    >(() => ({ x: 100, y: 100, angle: 0, phase: 'travel' }));
    vi.spyOn(beeTwoGeometry, 'createBeeTwoFlight').mockReturnValue({ advance });
    render(<BeeTwoAnimation />);
    tick(0);
    tick(100);
    expect(advance).toHaveBeenLastCalledWith(expect.any(Number), 0.1);
    act(() => {
      hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    advance.mockClear();
    tick(60000);
    expect(advance).not.toHaveBeenCalled();
    act(() => {
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    tick(60000);
    expect(advance).toHaveBeenLastCalledWith(0, 0);
  });

  it('positions the bee before its first frame and draws a trail without per-frame renders', () => {
    const { container } = render(<BeeTwoAnimation />);
    const bee = container.querySelector('canvas + div') as HTMLDivElement;
    const initialTransform = bee.style.transform;
    expect(initialTransform).toContain('translate(');
    for (let time = 0; time <= 1200; time += 100) tick(time);
    expect(bee.style.transform).not.toBe(initialTransform);
    expect(context.stroke).toHaveBeenCalled();
    expect(frames.size).toBe(1);
  });

  it('draws uniform dashes across trail sample boundaries', () => {
    let distance = 0;
    vi.spyOn(beeTwoGeometry, 'createBeeTwoSpeed').mockReturnValue({ advance: () => 70 });
    vi.spyOn(beeTwoGeometry, 'createBeeTwoFlight').mockReturnValue({
      advance: (step) => {
        distance += step;
        return { x: distance, y: 100, angle: 0, phase: 'travel' };
      },
    });
    render(<BeeTwoAnimation />);
    for (let time = 0; time <= 400; time += 100) tick(time);
    context.moveTo.mockClear();
    context.lineTo.mockClear();
    context.stroke.mockClear();
    tick(500);

    expect(context.moveTo.mock.calls).toEqual([
      [0, 100],
      [18, 100],
    ]);
    expect(context.lineTo.mock.calls.at(-1)).toEqual([26, 100]);
    expect(context.stroke).toHaveBeenCalledTimes(2);
  });

  it('recalculates the container after header and viewport changes', () => {
    const { container } = render(<BeeTwoAnimation aboveContent={false} fullViewport={false} />);
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

  it('rebuilds the flight when switching between above-content and behind-content modes', () => {
    const createFlight = vi.spyOn(beeTwoGeometry, 'createBeeTwoFlight');
    const { container, rerender } = render(
      <BeeTwoAnimation aboveContent={false} fullViewport={false} />,
    );
    const wrapper = container.firstElementChild as HTMLDivElement;
    rerender(<BeeTwoAnimation aboveContent fullViewport={false} />);
    expect(wrapper.style.top).toBe('0px');
    expect(createFlight).toHaveBeenLastCalledWith(
      { width: 1000, height: 800, top: 0 },
      expect.objectContaining({ excludeCenter: false }),
    );
    rerender(<BeeTwoAnimation aboveContent={false} fullViewport={false} />);
    expect(wrapper.style.top).toBe('160px');
    expect(createFlight).toHaveBeenLastCalledWith(
      { width: 1000, height: 640, top: 160 },
      expect.objectContaining({ excludeCenter: true }),
    );
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
    // Resume after the configured 90-second trail lifetime has expired.
    tick(100000);
    expect(bee.style.transform).toBe(previousTransform);
    expect(context.stroke).not.toHaveBeenCalled();
    tick(100100);
    expect(bee.style.transform).not.toBe(previousTransform);
    // The new short trail can contain multiple independent dashes.
    expect(context.stroke).toHaveBeenCalled();
  });

  it.each([16, 20, 48])('uses the existing clearance formula with a %spx bee', (size) => {
    const createFlight = vi.spyOn(beeTwoGeometry, 'createBeeTwoFlight');
    const createSpeed = vi.spyOn(beeTwoGeometry, 'createBeeTwoSpeed');
    const { container } = render(<BeeTwoAnimation settings={{ ...DEFAULT_BEE_SETTINGS, size }} />);
    const bee = container.querySelector('canvas + div') as HTMLDivElement;
    expect(bee.style.width).toBe(`${size}px`);
    expect(bee.style.height).toBe(`${size}px`);
    expect(createFlight).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        clearance: Math.hypot(size, size) / 2 + 2,
        outerPaddingRatio: -0.08,
        excludeCenter: true,
        loopVariation: 0.4,
        minTurnDegrees: 40,
        maxTurnDegrees: 60,
      }),
    );
    expect(createSpeed).toHaveBeenCalledWith(30, 80, 3, 6);
  });

  it('applies saved inputs, clears the trail, and replaces rather than duplicates the frame loop', () => {
    const createFlight = vi.spyOn(beeTwoGeometry, 'createBeeTwoFlight');
    const createSpeed = vi.spyOn(beeTwoGeometry, 'createBeeTwoSpeed');
    const { rerender } = render(<BeeTwoAnimation />);
    for (let time = 0; time < 500; time += 100) tick(time);
    const previousObservers = [...resizeObservers];
    const settings = {
      ...DEFAULT_BEE_SETTINGS,
      size: 48,
      minSpeed: 15,
      maxSpeed: 150,
      loopSize: 0.2,
      loopVariation: 0.1,
      travelIntensity: 0.3,
      loopSpacing: 1,
      maxQuadrantSeconds: 20,
      trailWidth: 4,
      trailLifetime: 5,
    };
    rerender(<BeeTwoAnimation settings={settings} />);
    expect(previousObservers.every(({ disconnect }) => disconnect.mock.calls.length === 1)).toBe(
      true,
    );
    expect(createSpeed).toHaveBeenLastCalledWith(15, 150, 3, 6);
    expect(createFlight).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        clearance: Math.hypot(48, 48) / 2 + 4,
        loopSizeRatio: 0.2,
        loopVariation: 0.1,
        travelIntensity: 0.3,
        loopSpacingRatio: 1,
        maxQuadrantSeconds: 20,
      }),
    );
    context.stroke.mockClear();
    tick(500);
    expect(context.stroke).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    setReducedMotion(true);
    rerender(<BeeTwoAnimation settings={{ ...settings, size: 16 }} />);
    expect(frames.size).toBe(0);
  });

  it.each([5, 90, 120])(
    'uses the configured %s-second trail lifetime, opacity, and width',
    (trailLifetime) => {
      let distance = 0;
      vi.spyOn(beeTwoGeometry, 'createBeeTwoSpeed').mockReturnValue({ advance: () => 70 });
      vi.spyOn(beeTwoGeometry, 'createBeeTwoFlight').mockReturnValue({
        advance: (step) => {
          distance += step;
          return { x: distance, y: 100, angle: 0, phase: 'travel' };
        },
      });
      const alphas: number[] = [];
      context.stroke.mockImplementation(() => {
        alphas.push(context.globalAlpha);
      });
      render(
        <BeeTwoAnimation
          settings={{ ...DEFAULT_BEE_SETTINGS, trailLifetime, trailOpacity: 0.4, trailWidth: 3.5 }}
        />,
      );
      for (let time = 0; time <= 500; time += 100) tick(time);
      expect(alphas.length).toBeGreaterThan(0);
      expect(alphas.every((alpha) => alpha === 0.2)).toBe(true); // Existing behind-content multiplier.
      expect((context as unknown as CanvasRenderingContext2D).lineWidth).toBe(3.5);
      context.stroke.mockClear();
      tick((trailLifetime + 1) * 1000);
      expect(context.stroke).not.toHaveBeenCalled();
      tick((trailLifetime + 1) * 1000 + 100);
      expect(context.stroke).toHaveBeenCalled();
    },
  );

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
