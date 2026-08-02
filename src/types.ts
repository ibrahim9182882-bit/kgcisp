export interface AccountItem {
  id: string;
  username: string;
  password?: string; // Optional on client side for security if omitted
  status: 'ONLINE' | 'OFFLINE' | 'CHECKING' | 'FAILED' | 'PENDING';
  accountStatus?: 'Active' | 'Expired' | 'Unknown';
  expiryDate?: string | null;
  lastChecked: string | null; // ISO string
  responseTimeMs: number | null;
  error: string | null;
  retryCount: number;
}

export interface ScanProgress {
  isScanning: boolean;
  isPaused: boolean;
  total: number;
  completed: number;
  online: number;
  offline: number;
  failed: number;
  currentCheckingUsername: string | null;
  percentage: number;
  estimatedRemainingTimeSec: number | null;
  startTime: string | null;
  endTime: string | null;
  concurrency: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  durationMs: number | null;
  status: 'ONLINE' | 'OFFLINE' | 'FAILED' | 'SYSTEM';
  success: boolean;
  reason: string | null;
  details?: string | null;
}

export interface ScheduleConfig {
  enabled: boolean;
  intervalMinutes: number; // 5, 10, 15, 30, 60
  nextRunTime: string | null;
}

export interface AccountsSummary {
  total: number;
  online: number;
  offline: number;
  failed: number;
  pending: number;
  active: number;
  expired: number;
  lastScanTime: string | null;
}
