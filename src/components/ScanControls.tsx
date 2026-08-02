import React from 'react';
import { ScanProgress } from '../types';
import { Play, Pause, Square, Clock, Cpu, Activity } from 'lucide-react';

interface ScanControlsProps {
  progress: ScanProgress;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  concurrency: number;
  onChangeConcurrency: (val: number) => void;
  scheduleEnabled: boolean;
  scheduleInterval: number;
  onUpdateSchedule: (enabled: boolean, interval: number) => void;
}

export const ScanControls: React.FC<ScanControlsProps> = ({
  progress,
  onStart,
  onPause,
  onResume,
  onStop,
  concurrency,
  onChangeConcurrency,
  scheduleEnabled,
  scheduleInterval,
  onUpdateSchedule,
}) => {
  const formatSec = (sec: number | null) => {
    if (sec === null || sec < 0) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="bg-[#0C0C0E] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
      {/* Upper Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-3">
          {!progress.isScanning ? (
            <button
              onClick={onStart}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START SCAN</span>
            </button>
          ) : progress.isPaused ? (
            <button
              onClick={onResume}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME SCAN</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2.5 cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE SCAN</span>
            </button>
          )}

          {progress.isScanning && (
            <button
              onClick={onStop}
              className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>STOP</span>
            </button>
          )}
        </div>

        {/* Concurrency & Auto Scheduler Config */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Concurrency Selector */}
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Workers:</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 3, 5, 10].map((val) => (
                <button
                  key={val}
                  onClick={() => onChangeConcurrency(val)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                    concurrency === val
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Config */}
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Auto Scan:</span>
            </div>
            <select
              value={scheduleInterval}
              onChange={(e) => onUpdateSchedule(scheduleEnabled, Number(e.target.value))}
              className="bg-[#161619] text-white text-xs font-mono font-bold rounded-lg border border-white/10 px-3 py-1 focus:outline-none focus:border-blue-500"
            >
              <option value={5}>5 MIN</option>
              <option value={10}>10 MIN</option>
              <option value={15}>15 MIN</option>
              <option value={30}>30 MIN</option>
              <option value={60}>60 MIN</option>
            </select>
            <button
              onClick={() => onUpdateSchedule(!scheduleEnabled, scheduleInterval)}
              className={`px-3 py-1 text-xs font-extrabold uppercase rounded-lg transition-all cursor-pointer ${
                scheduleEnabled
                  ? 'bg-green-500 text-black shadow-md'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {scheduleEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Scan Progress Area */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Activity className={`w-4 h-4 ${progress.isScanning ? 'text-blue-400 animate-spin' : 'text-white/30'}`} />
            <span className="font-bold uppercase tracking-wider text-white/80">
              {progress.isScanning
                ? `CHECKING QUEUE: ${progress.completed} / ${progress.total} ACCOUNTS`
                : 'ENGINE IDLE & READY'}
            </span>
            {progress.currentCheckingUsername && (
              <span className="text-yellow-400 bg-yellow-500/10 px-2.5 py-0.5 rounded border border-yellow-500/20 font-mono text-[11px] font-bold animate-pulse">
                [{progress.currentCheckingUsername}]
              </span>
            )}
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <span className="text-white/40 uppercase font-bold">
              ETA: <strong className="text-white font-mono">{formatSec(progress.estimatedRemainingTimeSec)}</strong>
            </span>
            <span className="text-blue-400 font-mono font-black text-sm">{progress.percentage}%</span>
          </div>
        </div>

        {/* Custom High-Contrast Progress Bar */}
        <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300 relative"
            style={{ width: `${Math.max(progress.percentage, 2)}%` }}
          >
            {progress.isScanning && !progress.isPaused && (
              <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
