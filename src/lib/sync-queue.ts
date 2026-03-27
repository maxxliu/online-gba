import type { SyncOperation } from '@/types';
import type { IndexedDBProvider } from './db';

type StatusCallback = (count: number) => void;
type ProcessCallback = (op: SyncOperation) => Promise<void>;

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export class SyncQueue {
  private localDb: IndexedDBProvider;
  private processing = false;
  private onStatusChange: StatusCallback | null = null;
  private processOp: ProcessCallback | null = null;
  private online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  constructor(localDb: IndexedDBProvider) {
    this.localDb = localDb;

    if (typeof window !== 'undefined') {
      this.onlineHandler = () => {
        this.online = true;
        this.drain();
      };
      this.offlineHandler = () => {
        this.online = false;
      };
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      if (this.onlineHandler) window.removeEventListener('online', this.onlineHandler);
      if (this.offlineHandler) window.removeEventListener('offline', this.offlineHandler);
    }
    this.onlineHandler = null;
    this.offlineHandler = null;
    this.processOp = null;
    this.onStatusChange = null;
  }

  setCallbacks(process: ProcessCallback, onStatus: StatusCallback): void {
    this.processOp = process;
    this.onStatus = onStatus;
  }

  private set onStatus(cb: StatusCallback | null) {
    this.onStatusChange = cb;
  }

  async enqueue(op: SyncOperation): Promise<void> {
    await this.localDb.saveSyncOp(op);
    await this.notifyCount();
    this.drain();
  }

  async drain(): Promise<void> {
    if (this.processing || !this.online || !this.processOp) return;
    this.processing = true;

    try {
      while (this.online) {
        const ops = await this.localDb.listSyncOps();
        if (ops.length === 0) break;

        // Sort by timestamp, oldest first
        ops.sort((a, b) => a.timestamp - b.timestamp);
        const op = ops[0];

        try {
          await this.processOp(op);
          await this.localDb.deleteSyncOp(op.dedupKey);
        } catch (err) {
          const retries = (op.retries ?? 0) + 1;
          if (retries >= MAX_RETRIES) {
            // Dead-letter: remove from queue
            console.error('[SyncQueue] Dead-lettered after max retries:', op.dedupKey, err);
            await this.localDb.deleteSyncOp(op.dedupKey);
          } else {
            // Exponential backoff then retry
            await this.localDb.saveSyncOp({ ...op, retries });
            const delay = BASE_DELAY_MS * Math.pow(2, retries - 1);
            await new Promise((r) => setTimeout(r, delay));
          }
        }

        await this.notifyCount();
      }
    } finally {
      this.processing = false;
    }
  }

  async getCount(): Promise<number> {
    const ops = await this.localDb.listSyncOps();
    return ops.length;
  }

  private async notifyCount(): Promise<void> {
    if (this.onStatusChange) {
      const count = await this.getCount();
      this.onStatusChange(count);
    }
  }
}
