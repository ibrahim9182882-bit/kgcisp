import React, { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFile: (file: File) => Promise<void>;
  onAddManualText: (text: string) => Promise<void>;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadFile,
  onAddManualText,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSubmit = async () => {
    if (!selectedFile) return;
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await onUploadFile(selectedFile);
      setFeedbackMessage('FILE SUCCESSFULLY UPLOADED AND PARSED!');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedbackMessage(`ERROR: ${err.message || 'FAILED TO UPLOAD FILE'}`);
      setIsSubmitting(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!manualText.trim()) return;
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await onAddManualText(manualText);
      setFeedbackMessage('ACCOUNTS ADDED SUCCESSFULLY!');
      setTimeout(() => {
        setIsSubmitting(false);
        setManualText('');
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedbackMessage(`ERROR: ${err.message || 'FAILED TO ADD ACCOUNTS'}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0C0C0E] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#0C0C0E]">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-black uppercase tracking-tight text-white">IMPORT ACCOUNTS</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-white/10 bg-white/[0.02]">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-3 text-xs font-black tracking-wider uppercase text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'border-blue-500 text-blue-400 bg-white/5'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            CSV / TXT FILE UPLOAD
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-3 text-xs font-black tracking-wider uppercase text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'border-blue-500 text-blue-400 bg-white/5'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            PASTE / MANUAL ENTRY
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 flex-1">
          {activeTab === 'file' ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-white/20 hover:border-blue-500 rounded-xl p-8 text-center bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <Upload className="w-10 h-10 text-blue-400 animate-bounce" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white">
                    DRAG AND DROP YOUR ACCOUNT FILE HERE
                  </p>
                  <p className="text-[11px] font-mono text-white/40 mt-1 uppercase">SUPPORTS .CSV, .TXT FILES</p>
                </div>
                <label className="inline-block px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl border border-white/10 cursor-pointer transition-all">
                  BROWSE FILES
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/10 text-xs font-mono text-white">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="font-bold">{selectedFile.name}</span>
                    <span className="text-white/40">({Math.round(selectedFile.size / 1024)} KB)</span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-white/40 hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Format Hint */}
              <div className="bg-black/30 p-4 rounded-xl border border-white/10 text-xs space-y-2">
                <p className="font-extrabold text-white/60 uppercase tracking-wider text-[10px]">EXPECTED FORMAT EXAMPLE:</p>
                <pre className="font-mono text-blue-300 bg-white/5 p-3 rounded-lg text-[11px] border border-white/5">
                  username,password{'\n'}
                  reajul.s,1234{'\n'}
                  nur.s,1234
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/60 mb-2">
                  PASTE MULTIPLE ACCOUNTS (ONE PER LINE):
                </label>
                <textarea
                  rows={6}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={`reajul.s, 1234\nnur.s, 1234\nuser3: pass3`}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          )}

          {feedbackMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-mono font-bold uppercase ${
                feedbackMessage.startsWith('ERROR')
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-green-500/10 border border-green-500/20 text-green-400'
              }`}
            >
              {feedbackMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={activeTab === 'file' ? handleFileSubmit : handleTextSubmit}
            disabled={isSubmitting || (activeTab === 'file' ? !selectedFile : !manualText.trim())}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            {isSubmitting ? 'PROCESSING...' : 'IMPORT ACCOUNTS'}
          </button>
        </div>
      </div>
    </div>
  );
};
