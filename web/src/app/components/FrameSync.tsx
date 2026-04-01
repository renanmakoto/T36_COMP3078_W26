'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isLaneMatch, readChord, readLaneHref } from './keyframe';

export function FrameSync() {
  const pathname = usePathname();
  const router = useRouter();
  const trailRef = useRef('');

  useEffect(() => {
    const chord = readChord();
    const laneHref = readLaneHref();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      trailRef.current = (trailRef.current + event.key.toLowerCase()).slice(-chord.length);

      if (trailRef.current === chord && !isLaneMatch(pathname)) {
        trailRef.current = '';
        router.push(laneHref);
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [pathname, router]);

  return null;
}
