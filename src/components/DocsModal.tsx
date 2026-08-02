import React from 'react';
import { FileText, X, Terminal, Cpu, ShieldCheck } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0C0C0E] border border-white/10 rounded-2xl w-full max-w-3xl h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#0C0C0E]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-black uppercase tracking-tight text-white">SYSTEM DOCUMENTATION</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 text-white/80 text-xs">
          {/* Overview */}
          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>PROJECT OVERVIEW & ARCHITECTURE</span>
            </h3>
            <p className="text-white/50 leading-relaxed font-medium">
              This application is built for ISP Network Operations Centers (NOC) and authorized account managers to automatically verify connection status across hundreds of customer accounts hosted on the Kurigram ISP Customer Portal.
            </p>
          </section>

          {/* Authentication & Verification Logic */}
          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>AUTHENTICATION & JQUERY AJAX HANDLING</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-white/50 font-medium">
              <li>Opens customer login target URL: <code className="text-blue-300 bg-white/5 px-2 py-0.5 rounded font-mono">https://user.kurigramisp.com/customer/login</code></li>
              <li>Extracts CSRF tokens (<code className="text-blue-300 bg-white/5 px-1 py-0.5 rounded font-mono">_token</code>) and session cookies.</li>
              <li>Sends jQuery AJAX headers: <code className="text-blue-300 bg-white/5 px-1.5 py-0.5 rounded font-mono">X-Requested-With: XMLHttpRequest</code> and <code className="text-blue-300 bg-white/5 px-1.5 py-0.5 rounded font-mono">X-CSRF-TOKEN</code>. (Required because ISP portals configured for jQuery AJAX reject non-AJAX POSTs with HTTP 500/419/403).</li>
              <li>Parses JSON redirect payloads (e.g. <code className="text-blue-300 bg-white/5 px-1.5 py-0.5 rounded font-mono">&#123;"status": true, "redirect": "/customer/dashboard"&#125;</code>).</li>
              <li>Fetches customer dashboard HTML using authenticated session cookies to verify status badges (e.g. <code className="text-green-400 bg-white/5 px-2 py-0.5 rounded font-mono">ONLINE</code> or <code className="text-red-400 bg-white/5 px-2 py-0.5 rounded font-mono">OFFLINE</code>).</li>
              <li>Includes automated retries and standard form fallback if the portal server returns transient errors.</li>
            </ul>
          </section>

          {/* Environmental Variables */}
          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>ENVIRONMENT CONFIGURATION (.ENV)</span>
            </h3>
            <pre className="bg-black/40 p-4 rounded-xl border border-white/10 text-xs text-blue-300 font-mono">
              PORT=3000{'\n'}
              HEADLESS=true{'\n'}
              CONCURRENT_BROWSERS=5{'\n'}
              LOGIN_URL="https://user.kurigramisp.com/customer/login"
            </pre>
          </section>

          {/* How to Run Commands */}
          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">SETUP & EXECUTION COMMANDS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                <h4 className="font-extrabold text-white/60 text-[11px] uppercase tracking-wider mb-2">BACKEND SETUP</h4>
                <pre className="font-mono text-xs text-white/50 space-y-1">
                  npm install{'\n'}
                  npm run dev
                </pre>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                <h4 className="font-extrabold text-white/60 text-[11px] uppercase tracking-wider mb-2">PRODUCTION BUILD</h4>
                <pre className="font-mono text-xs text-white/50 space-y-1">
                  npm run build{'\n'}
                  npm start
                </pre>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
