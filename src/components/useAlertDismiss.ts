import { useEffect, useRef, useState } from 'react';

/**
 * Tracks dismissal of an alert that should reappear each time it newly becomes active
 * (e.g. re-entering a caution/breach zone after being safe), even if the user dismissed
 * a previous instance of it.
 */
export function useAlertDismiss(active: boolean) {
  const [dismissed, setDismissed] = useState(false);
  const prevActive = useRef(active);

  useEffect(() => {
    if (active && !prevActive.current) setDismissed(false);
    prevActive.current = active;
  }, [active]);

  return { visible: active && !dismissed, dismiss: () => setDismissed(true) };
}
