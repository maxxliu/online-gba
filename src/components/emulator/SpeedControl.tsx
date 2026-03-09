'use client';

import { motion } from 'framer-motion';
import { SPEED_OPTIONS } from '@/lib/constants';
import styles from './SpeedControl.module.css';

interface SpeedControlProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export function SpeedControl({ currentSpeed, onSpeedChange }: SpeedControlProps) {
  return (
    <div className={styles.bar}>
      {SPEED_OPTIONS.map((speed) => (
        <button
          key={speed}
          className={styles.segment}
          onClick={() => onSpeedChange(speed)}
          aria-label={`Set speed to ${speed}x`}
          type="button"
        >
          {currentSpeed === speed && (
            <motion.div
              className={styles.indicator}
              layoutId="speed-indicator"
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            />
          )}
          <span className={styles.label}>{speed}x</span>
        </button>
      ))}
    </div>
  );
}
