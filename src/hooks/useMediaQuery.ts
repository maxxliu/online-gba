'use client';

import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '@/lib/constants';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface MediaQueryState {
  breakpoint: Breakpoint;
  orientation: 'portrait' | 'landscape';
  isMobile: boolean;
  isLandscape: boolean;
}

const SSR_DEFAULT: MediaQueryState = {
  breakpoint: 'mobile',
  orientation: 'portrait',
  isMobile: true,
  isLandscape: false,
};

function getState(
  mobileQuery: MediaQueryList,
  tabletQuery: MediaQueryList,
  landscapeQuery: MediaQueryList,
): MediaQueryState {
  const breakpoint: Breakpoint = mobileQuery.matches
    ? 'mobile'
    : tabletQuery.matches
      ? 'tablet'
      : 'desktop';

  const orientation = landscapeQuery.matches ? 'landscape' : 'portrait';

  return {
    breakpoint,
    orientation,
    isMobile: breakpoint === 'mobile',
    isLandscape: landscapeQuery.matches,
  };
}

export function useMediaQuery(): MediaQueryState {
  const [state, setState] = useState<MediaQueryState>(SSR_DEFAULT);

  useEffect(() => {
    const mobileQuery = window.matchMedia(
      `(max-width: ${BREAKPOINTS.mobile - 0.02}px)`,
    );
    const tabletQuery = window.matchMedia(
      `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 0.02}px)`,
    );
    const landscapeQuery = window.matchMedia('(orientation: landscape)');

    const update = () => {
      setState(getState(mobileQuery, tabletQuery, landscapeQuery));
    };

    // Sync immediately after hydration
    update();

    mobileQuery.addEventListener('change', update);
    tabletQuery.addEventListener('change', update);
    landscapeQuery.addEventListener('change', update);

    // Capture refs for cleanup
    const mq = mobileQuery;
    const tq = tabletQuery;
    const lq = landscapeQuery;

    return () => {
      mq.removeEventListener('change', update);
      tq.removeEventListener('change', update);
      lq.removeEventListener('change', update);
    };
  }, []);

  return state;
}
