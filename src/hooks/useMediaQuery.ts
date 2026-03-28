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
  phoneLandscapeQuery: MediaQueryList,
): MediaQueryState {
  // A phone in landscape (height < 500px) exceeds the 768px mobile breakpoint
  // but should still use mobile layout, not the desktop GBA shell
  const isPhoneLandscape = phoneLandscapeQuery.matches;

  const breakpoint: Breakpoint =
    mobileQuery.matches || isPhoneLandscape
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
    // Phones in landscape have width > 768px but height < 500px — still mobile
    const phoneLandscapeQuery = window.matchMedia(
      '(orientation: landscape) and (max-height: 500px)',
    );

    const update = () => {
      setState(
        getState(mobileQuery, tabletQuery, landscapeQuery, phoneLandscapeQuery),
      );
    };

    // Sync immediately after hydration
    update();

    mobileQuery.addEventListener('change', update);
    tabletQuery.addEventListener('change', update);
    landscapeQuery.addEventListener('change', update);
    phoneLandscapeQuery.addEventListener('change', update);

    // Capture refs for cleanup
    const mq = mobileQuery;
    const tq = tabletQuery;
    const lq = landscapeQuery;
    const plq = phoneLandscapeQuery;

    return () => {
      mq.removeEventListener('change', update);
      tq.removeEventListener('change', update);
      lq.removeEventListener('change', update);
      plq.removeEventListener('change', update);
    };
  }, []);

  return state;
}
