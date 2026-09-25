import { useEffect, useState } from 'react';

import { BeeAnimation } from '@/components/BeeAnimation';
import { getPublishedBeeSettings } from '@/lib/functions/bee-settings.functions';
import type { BeeSettingsSnapshot } from '@/lib/shared/bee-settings';

export function SiteBeeAnimation({ initial }: { initial: BeeSettingsSnapshot }) {
  const [published, setPublished] = useState(initial);
  // A route revalidation can bring newer data, but must never replace a newer poll.
  if (initial.revision > published.revision) setPublished(initial);

  useEffect(() => {
    let active = true;
    let pending = false;

    async function refresh() {
      if (!active || document.hidden || pending) return;
      pending = true;
      try {
        const next = await getPublishedBeeSettings();
        if (!active) return;
        setPublished((current) => {
          if (next.revision > current.revision) return next;
          return current;
        });
      } catch {
        // Keep the working animation; the next visible check will retry.
      } finally {
        pending = false;
      }
    }

    // Timers and browser listeners are external systems: own their cleanup here.
    const interval = window.setInterval(() => void refresh(), 15_000);
    const onReturn = () => void refresh();
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    // Also cover a route restored from the router's loader cache.
    void refresh();
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, []);

  return <BeeAnimation settings={published.settings} />;
}
