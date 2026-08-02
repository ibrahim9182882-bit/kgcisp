import React, { useEffect, useState } from 'react';
import { SystemLog } from '../types';
import { Terminal, X, RotateCw } from 'lucide-react';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFetchLogs: () => Promise<SystemLog[]>;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose, onFetchLogs }) => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE' | 'FAILED' | 'SYSTEM'>('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await onFetchLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => filter === 'ALL' || log.status === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0C0C0E] border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#0C0C0E]">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-black uppercase tracking-tight text-white">AUDIT & SYSTEM LOGS</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              title="Refresh Logs"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white/[0.02] border-b border-white/10 text-xs font-mono">
          <span className="text-white/40 uppercase font-bold">RECORDED LOG ENTRIES ({filteredLogs.length})</span>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {['ALL', 'ONLINE', 'OFFLINE', 'FAILED', 'SYSTEM'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st as any)}
                className={`px-3 py-1 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                  filter === st
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Console Log Stream */}
        <div className="p-6 flex-1 overflow-y-auto bg-black/40 font-mono text-xs space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-white/30 uppercase font-bold">No log entries recorded yet.</div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/5 transition-colors gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white/30">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>

                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase border ${
                      log.status === 'ONLINE'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : log.status === 'OFFLINE'
                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                        : log.status === 'FAILED'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}
                  >
                    {log.status}
                  </span>

                  <span className="text-white font-bold">{log.username}</span>
                  <span className="text-white/40">- {log.action}</span>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  {log.durationMs !== null && (
                    <span className="text-blue-400 font-bold">{log.durationMs} ms</span>
                  )}
                  {log.reason && <span className="text-red-400">{log.reason}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
