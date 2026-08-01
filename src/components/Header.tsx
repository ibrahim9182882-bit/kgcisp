import React from 'react';
import { Network, Upload, RefreshCw, Terminal, FileText, Activity } from 'lucide-react';

interface HeaderProps {
  onOpenUploadModal: () => void;
  onOpenLogsModal: () => void;
  onOpenDocsModal: () => void;
  isScanning: boolean;
  scheduleEnabled: boolean;
  scheduleInterval: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUploadModal,
  onOpenLogsModal,
  onOpenDocsModal,
  isScanning,
  scheduleEnabled,
  scheduleInterval,
}) => {
  return (
    <header className="bg-[#0C0C0E] border-b border-white/5 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-600/30">
            S
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none uppercase text-white">
              ISP Sentinel
            </h1>
            <p className="text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase mt-1">
              Multi-Account Connection Pulse Monitor
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="hidden lg:flex flex-col items-end px-4 border-r border-white/10">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Engine Status</span>
            <span className="text-xs font-mono text-blue-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
              {isScanning ? 'ACTIVE WORKERS' : 'SYSTEM READY'}
            </span>
          </div>

          {scheduleEnabled && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>AUTO: {scheduleInterval}M</span>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={onOpenUploadModal}
            className="px-5 py-2.5 bg-white hover:bg-gray-200 text-black font-extrabold text-xs tracking-wider uppercase rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>IMPORT ACCOUNTS</span>
          </button>

          {/* Logs Button */}
          <button
            onClick={onOpenLogsModal}
            className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs tracking-wider uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            title="Access System Logs"
          >
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">LOGS</span>
          </button>

          {/* Docs Button */}
          <button
            onClick={onOpenDocsModal}
            className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 font-bold text-xs tracking-wider uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            title="Documentation"
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">DOCS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
