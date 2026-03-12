'use client';

import type { ReactNode } from 'react';
import styles from './GameBoyShell.module.css';
import { ScreenBezel } from './ScreenBezel';
import { DPad } from './DPad';
import { ActionButtons } from './ActionButtons';
import { SystemButtons } from './SystemButtons';
import { Bumpers } from './Bumpers';


interface GameBoyShellProps {
  onButtonPress?: (name: string) => void;
  onButtonRelease?: (name: string) => void;
  pressedButtons?: Record<string, boolean>;
  isPoweredOn?: boolean;
  scanlinesEnabled?: boolean;
  children?: ReactNode;
}

export function GameBoyShell({
  onButtonPress,
  onButtonRelease,
  pressedButtons,
  isPoweredOn = false,
  scanlinesEnabled = false,
  children,
}: GameBoyShellProps) {
  return (
    <div className={styles.shell}>
      <Bumpers onButtonPress={onButtonPress} onButtonRelease={onButtonRelease} pressedButtons={pressedButtons} />
      <div
        className={styles.powerLed}
        data-on={isPoweredOn}
        aria-label={isPoweredOn ? 'Power on' : 'Power off'}
      />
      <ScreenBezel isPoweredOn={isPoweredOn} scanlinesEnabled={scanlinesEnabled}>{children}</ScreenBezel>
      <div className={styles.shellSeam} />
      <DPad onButtonPress={onButtonPress} onButtonRelease={onButtonRelease} pressedButtons={pressedButtons} />
      <ActionButtons onButtonPress={onButtonPress} onButtonRelease={onButtonRelease} pressedButtons={pressedButtons} />
      <SystemButtons onButtonPress={onButtonPress} onButtonRelease={onButtonRelease} pressedButtons={pressedButtons} />
    </div>
  );
}
