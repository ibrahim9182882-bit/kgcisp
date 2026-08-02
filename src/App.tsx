import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AccountItem, ScanProgress, AccountsSummary, SystemLog } from './types';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { ScanControls } from './components/ScanControls';
import { AccountsTable } from './components/AccountsTable';
import { UploadModal } from './components/UploadModal';
import { LogsModal } from './components/LogsModal';
import { DocsModal } from './components/DocsModal';

export default function App() {
  const [summary, setSummary] = useState<AccountsSummary>({
    total: 0,
    online: 0,
    offline: 0,
    failed: 0,
    pending: 0,
    lastScanTime: null,
  });

  const [progress, setProgress] = useState<ScanProgress>({
    isScanning: false,
    isPaused: false,
    total: 0,
    completed: 0,
    online: 0,
    offline: 0,
    failed: 0,
    currentCheckingUsername: null,
    percentage: 0,
    estimatedRemainingTimeSec: null,
    startTime: null,
    endTime: null,
    concurrency: 5,
  });

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('username');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [concurrency, setConcurrency] = useState<number>(5);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduleInterval, setScheduleInterval] = useState<number>(15);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Fetch Accounts List
  const fetchAccounts = async () => {
    try {
      const res = await axios.get('/api/accounts', {
        params: {
          status: filterStatus,
          search: searchQuery,
          sortBy,
          sortOrder,
        },
      });
      setAccounts(res.data.accounts || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  // Fetch Summary Stats
  const fetchSummary = async () => {
    try {
      const res = await axios.get('/api/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  // Fetch Progress
  const fetchProgress = async () => {
    try {
      const res = await axios.get('/api/progress');
      setProgress(res.data);
      if (res.data.concurrency) {
        setConcurrency(res.data.concurrency);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  // Poll progress and accounts periodically
  useEffect(() => {
    fetchSummary();
    fetchAccounts();
    fetchProgress();

    const interval = setInterval(() => {
      fetchProgress();
      fetchSummary();
      fetchAccounts();
    }, 2000);

    return () => clearInterval(interval);
  }, [filterStatus, searchQuery, sortBy, sortOrder]);

  // Handle Scan Actions
  const handleStartScan = async () => {
    try {
      await axios.post('/api/scan');
      fetchProgress();
    } catch (err) {
      console.error('Failed to start scan:', err);
    }
  };

  const handlePauseScan = async () => {
    try {
      await axios.post('/api/pause');
      fetchProgress();
    } catch (err) {
      console.error('Failed to pause scan:', err);
    }
  };

  const handleResumeScan = async () => {
    try {
      await axios.post('/api/resume');
      fetchProgress();
    } catch (err) {
      console.error('Failed to resume scan:', err);
    }
  };

  const handleStopScan = async () => {
    try {
      await axios.post('/api/stop');
      fetchProgress();
    } catch (err) {
      console.error('Failed to stop scan:', err);
    }
  };

  const handleChangeConcurrency = async (val: number) => {
    try {
      const res = await axios.post('/api/config', { newConcurrency: val });
      setConcurrency(res.data.concurrency);
    } catch (err) {
      console.error('Failed to update concurrency:', err);
    }
  };

  const handleUpdateSchedule = async (enabled: boolean, interval: number) => {
    try {
      await axios.post('/api/schedule', {
        enabled,
        intervalMinutes: interval,
      });
      setScheduleEnabled(enabled);
      setScheduleInterval(interval);
    } catch (err) {
      console.error('Failed to update schedule:', err);
    }
  };

  // Account Management
  const handleDeleteAccount = async (id: string) => {
    try {
      await axios.delete(`/api/accounts?id=${id}`);
      fetchAccounts();
      fetchSummary();
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const handleClearAllAccounts = async () => {
    try {
      await axios.delete('/api/accounts?clearAll=true');
      fetchAccounts();
      fetchSummary();
    } catch (err) {
      console.error('Failed to clear all accounts:', err);
    }
  };

  // Import Accounts Handlers
  const handleUploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    fetchAccounts();
    fetchSummary();
  };

  const handleAddManualText = async (text: string) => {
    await axios.post('/api/accounts/add', { rawText: text });
    fetchAccounts();
    fetchSummary();
  };

  // Export
  const handleExport = (format: 'csv' | 'json') => {
    window.open(`/api/export?format=${format}`, '_blank');
  };

  // Fetch Audit Logs
  const handleFetchLogs = async (): Promise<SystemLog[]> => {
    const res = await axios.get('/api/logs');
    return res.data.logs || [];
  };

  // Sorting Handler
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F8F9FA] font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Header */}
      <Header
        onOpenUploadModal={() => setIsUploadOpen(true)}
        onOpenLogsModal={() => setIsLogsOpen(true)}
        onOpenDocsModal={() => setIsDocsOpen(true)}
        isScanning={progress.isScanning}
        scheduleEnabled={scheduleEnabled}
        scheduleInterval={scheduleInterval}
      />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Metric Cards */}
        <StatsCards summary={summary} progress={progress} />

        {/* Scan & Scheduling Controls */}
        <ScanControls
          progress={progress}
          onStart={handleStartScan}
          onPause={handlePauseScan}
          onResume={handleResumeScan}
          onStop={handleStopScan}
          concurrency={concurrency}
          onChangeConcurrency={handleChangeConcurrency}
          scheduleEnabled={scheduleEnabled}
          scheduleInterval={scheduleInterval}
          onUpdateSchedule={handleUpdateSchedule}
        />

        {/* Accounts Table & Filters */}
        <AccountsTable
          accounts={accounts}
          total={summary.total}
          onRefresh={() => {
            fetchAccounts();
            fetchSummary();
          }}
          onDeleteAccount={handleDeleteAccount}
          onClearAll={handleClearAllAccounts}
          onExport={handleExport}
          filterStatus={filterStatus}
          onSetFilterStatus={setFilterStatus}
          searchQuery={searchQuery}
          onSetSearchQuery={setSearchQuery}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0C0C0E] py-4 text-center text-[10px] font-mono uppercase tracking-widest text-white/30">
        <p>ISP SENTINEL • MULTI-ACCOUNT CONNECTION MONITOR • NOC OPERATIONS</p>
      </footer>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadFile={handleUploadFile}
        onAddManualText={handleAddManualText}
      />

      <LogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        onFetchLogs={handleFetchLogs}
      />

      <DocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}
