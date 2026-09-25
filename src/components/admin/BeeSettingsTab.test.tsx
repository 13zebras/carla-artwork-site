// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BeeSettingsTab } from '@/components/admin/BeeSettingsTab';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_BEE_SETTINGS } from '@/lib/shared/bee-settings';
import type { BeeSettings, BeeSettingsSnapshot } from '@/lib/shared/bee-settings';

const { save, success } = vi.hoisted(() => ({
  save: vi.fn<(input: { data: BeeSettings }) => Promise<BeeSettingsSnapshot>>(),
  success: vi.fn<(message: string) => void>(),
}));
vi.mock('@/lib/functions/bee-settings.functions', () => ({ saveBeeSettings: save }));
vi.mock('sonner', () => ({ toast: { success } }));

async function renderTab(settings: BeeSettings = { ...DEFAULT_BEE_SETTINGS }) {
  // Base UI measures edge-aligned thumbs in a microtask after mounting.
  await act(async () => {
    render(
      <Tabs defaultValue='bee'>
        <TabsList>
          <TabsTrigger value='bee'>Bee</TabsTrigger>
          <TabsTrigger value='other'>Other</TabsTrigger>
        </TabsList>
        <BeeSettingsTab bee={{ settings, revision: 0 }} />
      </Tabs>,
    );
  });
}

beforeEach(() => {
  // jsdom has no layout; edge-aligned thumbs remain hidden until measured.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const width = this.dataset.slot === 'slider-thumb' ? 12 : 300;
      return DOMRect.fromRect({ width, height: 20 });
    },
  );
  save.mockReset().mockImplementation(async ({ data }: { data: BeeSettings }) => ({
    settings: data,
    revision: 1,
  }));
  success.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Bee settings tab', () => {
  it('shows labeled controls with descriptions, actual units, and integer readouts', async () => {
    await renderTab();
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(10); // Speed has two thumbs; thickness uses radios.
    const size = screen.getByRole('slider', { name: 'Bee size' }) as HTMLInputElement;
    expect(size.min).toBe('16');
    expect(size.max).toBe('48');
    expect(size.step).toBe('1');
    expect(size.value).toBe('20');
    expect(size.getAttribute('aria-valuetext')).toBe('20 pixels');
    expect(screen.getByText('16px')).toBeTruthy();
    expect(screen.getByText('48px')).toBeTruthy();
    for (const slider of sliders) {
      const descriptionId = slider.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();
      expect(document.getElementById(descriptionId ?? '')?.textContent).toMatch(
        /^Bee|^Loops|^Trail|^Higher/,
      );
    }
    const duration = screen.getByRole('slider', { name: 'Trail duration' }) as HTMLInputElement;
    expect(duration.min).toBe('10');
    expect(duration.max).toBe('180');
    expect(duration.step).toBe('1');
    expect(duration.value).toBe('90');
    expect(duration.getAttribute('aria-valuetext')).toBe('90 seconds');
    expect(screen.getByText('10 seconds')).toBeTruthy();
    expect(screen.getByText('180 seconds')).toBeTruthy();
    const opacity = screen.getByRole('slider', { name: 'Trail opacity' }) as HTMLInputElement;
    expect(opacity.min).toBe('10');
    expect(opacity.max).toBe('100');
    expect(opacity.value).toBe('90');
    expect(opacity.getAttribute('aria-valuetext')).toBe('90 percent');
    expect(screen.getByText('90%')).toBeTruthy();
    expect(screen.getByText('Higher number = trail darker.')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect((screen.getByRole('radio', { name: '2px' }) as HTMLInputElement).checked).toBe(true);
    for (const output of screen.getAllByRole('status')) {
      expect(output.textContent).not.toMatch(/\d+\.\d+/);
    }
    for (const slider of sliders.filter(
      (slider) => ![size, duration, opacity].includes(slider as HTMLInputElement),
    )) {
      expect(slider.getAttribute('min')).toBe('0');
      expect(slider.getAttribute('max')).toBe('100');
    }
    expect(
      (screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('saves seconds, actual opacity, and each pixel thickness without altering other settings', async () => {
    await renderTab();
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Trail duration' }), {
      key: 'ArrowRight',
    });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Trail opacity' }), { key: 'ArrowLeft' });
    for (const width of [1, 2, 3, 4]) {
      fireEvent.click(screen.getByRole('radio', { name: `${width}px` }));
      expect((screen.getByRole('radio', { name: `${width}px` }) as HTMLInputElement).checked).toBe(
        true,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
      await waitFor(() => expect(success).toHaveBeenCalledTimes(width));
      expect(save).toHaveBeenLastCalledWith({
        data: { ...DEFAULT_BEE_SETTINGS, trailLifetime: 91, trailOpacity: 0.89, trailWidth: width },
      });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect((screen.getByRole('radio', { name: '2px' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('90%')).toBeTruthy();
    expect(screen.getByText('90 seconds')).toBeTruthy();
  });

  it('supports keyboard size changes and publishes only on Save, preserving other defaults exactly', async () => {
    await renderTab();
    const size = screen.getByRole('slider', { name: 'Bee size' });
    fireEvent.keyDown(size, { key: 'ArrowRight' });
    expect((size as HTMLInputElement).value).toBe('21');
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(success).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith({ data: { ...DEFAULT_BEE_SETTINGS, size: 21 } });
    expect(
      (screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Other' })));
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Bee' })));
    expect((screen.getByRole('slider', { name: 'Bee size' }) as HTMLInputElement).value).toBe('21');
  });

  it('gives speed endpoints separate names and prevents crossing with keyboard controls', async () => {
    await renderTab();
    const slowest = screen.getByRole('slider', { name: 'Flight speed: Slowest' });
    const fastest = screen.getByRole('slider', { name: 'Flight speed: Fastest' });
    fireEvent.keyDown(slowest, { key: 'End' });
    expect(Number((slowest as HTMLInputElement).value)).toBeLessThanOrEqual(
      Number((fastest as HTMLInputElement).value),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const data = save.mock.calls[0][0].data as BeeSettings;
    expect(data.minSpeed).toBeLessThanOrEqual(data.maxSpeed);
  });

  it('keeps edits on failure and permits retry', async () => {
    save.mockRejectedValueOnce(new Error('Connection lost'));
    await renderTab();
    fireEvent.change(screen.getByRole('slider', { name: 'Bee size' }), { target: { value: '48' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await screen.findByText('Connection lost');
    expect((screen.getByRole('slider', { name: 'Bee size' }) as HTMLInputElement).value).toBe('48');
    expect(success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(success).toHaveBeenCalledOnce());
    expect(screen.queryByText('Connection lost')).toBeNull();
  });

  it('resets only the draft and prevents edits/duplicate saves while saving', async () => {
    let finish: (value: BeeSettingsSnapshot) => void = () => {};
    save.mockReturnValue(
      new Promise<BeeSettingsSnapshot>((resolve) => {
        finish = resolve;
      }),
    );
    await renderTab({ ...DEFAULT_BEE_SETTINGS, size: 32 });
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect((screen.getByRole('slider', { name: 'Bee size' }) as HTMLInputElement).value).toBe('20');
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(
        screen.getAllByRole('slider').every((slider) => (slider as HTMLInputElement).disabled),
      ).toBe(true),
    );
    expect(
      screen.getAllByRole('radio').every((radio) => (radio as HTMLInputElement).disabled),
    ).toBe(true);
    const savingButton = screen.getByRole('button', { name: 'Saving…' });
    fireEvent.click(savingButton);
    expect(save).toHaveBeenCalledOnce();
    await act(async () => finish({ settings: { ...DEFAULT_BEE_SETTINGS }, revision: 1 }));
    expect(success).toHaveBeenCalledOnce();
  });
});
