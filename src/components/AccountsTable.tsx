import React, { useState } from 'react';
import { AccountItem } from '../types';
import {
  Search,
  XCircle,
  Clock,
  Trash2,
  ArrowUpDown,
  Download,
  RotateCw,
  Zap,
} from 'lucide-react';

interface AccountsTableProps {
  accounts: AccountItem[];
  total: number;
  onRefresh: () => void;
  onDeleteAccount: (id: string) => void;
  onClearAll: () => void;
  onExport: (format: 'csv' | 'json') => void;
  filterStatus: string;
  onSetFilterStatus: (status: string) => void;
  searchQuery: string;
  onSetSearchQuery: (query: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export const AccountsTable: React.FC<AccountsTableProps> = ({
  accounts,
  total,
  onRefresh,
  onDeleteAccount,
  onClearAll,
  onExport,
  filterStatus,
  onSetFilterStatus,
  searchQuery,
  onSetSearchQuery,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const totalPages = Math.ceil(accounts.length / pageSize) || 1;
  const paginatedAccounts = accounts.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = (status: AccountItem['status']) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-green-500/10 text-green-500 border border-green-500/20 uppercase">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>ONLINE</span>
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>OFFLINE</span>
          </span>
        );
      case 'CHECKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase">
            <RotateCw className="w-3 h-3 animate-spin text-yellow-400" />
            <span>CHECKING</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>LOGIN FAILED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/5 text-white/40 border border-white/10 uppercase">
            <Clock className="w-3 h-3" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  const formatLastChecked = (iso: string | null) => {
    if (!iso) return '--:--:--';
    const date = new Date(iso);
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-[#0C0C0E] border border-white/10 rounded-2xl shadow-2xl space-y-5 p-6">
      {/* Search, Filters & Export Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSetSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search account username..."
            className="w-full bg-white/5 border border-white/10 text-white text-xs font-medium rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-white/30"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {['ALL', 'ONLINE', 'OFFLINE', 'FAILED', 'PENDING'].map((st) => (
            <button
              key={st}
              onClick={() => {
                onSetFilterStatus(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onExport('csv')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>EXPORT CSV</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all cursor-pointer"
            title="Refresh Table"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {accounts.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear ALL accounts?')) {
                  onClearAll();
                }
              }}
              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all cursor-pointer"
              title="Clear All Accounts"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="overflow-x-auto border border-white/10 rounded-xl bg-black/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02] text-white/40 text-[10px] font-black tracking-widest uppercase border-b border-white/10">
              <th className="py-3.5 px-5 font-black">
                <button
                  onClick={() => onSort('username')}
                  className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  <span>USERNAME</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3.5 px-5 font-black">
                <button
                  onClick={() => onSort('status')}
                  className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  <span>CONNECTION STATUS</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3.5 px-5 font-black">
                <button
                  onClick={() => onSort('lastChecked')}
                  className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  <span>LAST CHECKED</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3.5 px-5 font-black">
                <button
                  onClick={() => onSort('responseTimeMs')}
                  className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  <span>RESPONSE TIME</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3.5 px-5 font-black">ERROR LOG</th>
              <th className="py-3.5 px-5 font-black text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs font-mono">
            {paginatedAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-white/30">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Zap className="w-8 h-8 text-white/20" />
                    <p className="font-bold text-white/60 uppercase">No accounts found</p>
                    <p className="text-[11px] text-white/30">
                      Import CSV/TXT or add accounts manually to begin connection checking.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-white">{account.username}</td>
                  <td className="py-3.5 px-5">{getStatusBadge(account.status)}</td>
                  <td className="py-3.5 px-5 text-white/40">
                    {formatLastChecked(account.lastChecked)}
                  </td>
                  <td className="py-3.5 px-5 text-blue-400 font-bold">
                    {account.responseTimeMs ? `${account.responseTimeMs} ms` : '--'}
                  </td>
                  <td className="py-3.5 px-5 text-red-400 max-w-xs truncate" title={account.error || ''}>
                    {account.error || <span className="text-white/20">None</span>}
                  </td>
                  <td className="py-3.5 px-5 text-right flex items-center justify-end gap-1">
                    <button
                      onClick={async () => {
                        try {
                          await fetch('/api/accounts/check-single', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: account.username }),
                          });
                          onRefresh();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="p-1.5 text-white/30 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Re-check Account"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteAccount(account.id)}
                      className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-white/40 font-mono pt-2">
        <span>
          SHOWING {accounts.length > 0 ? (page - 1) * pageSize + 1 : 0} TO{' '}
          {Math.min(page * pageSize, accounts.length)} OF {accounts.length} ACCOUNTS
        </span>

        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-bold rounded-lg border border-white/10 cursor-pointer uppercase"
          >
            PREV
          </button>
          <span className="font-bold text-white">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-bold rounded-lg border border-white/10 cursor-pointer uppercase"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
};
