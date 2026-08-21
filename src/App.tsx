import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, ArrowRight, Download, RefreshCw, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { analyzePDF, compressPDF, formatBytes } from './utils/pdfCompressor';
import { PDFAnalysis, CompressionTarget, CompressionProgress, CompressionResult } from './types';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PDFAnalysis | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<CompressionTarget | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<CompressionProgress | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
    setResult(null);
    setIsAnalyzing(true);

    try {
      const data = await analyzePDF(selectedFile);
      setAnalysis(data);
      setSelectedTarget(data.targets[1] || data.targets[0]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze PDF file.');
      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleStartCompression = async () => {
    if (!file || !selectedTarget) return;

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const res = await compressPDF(file, selectedTarget, (p) => setProgress(p));
      setResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Compression pipeline failed.');
    } finally {
      setIsCompressing(false);
      setProgress(null);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setSelectedTarget(null);
    setResult(null);
    setProgress(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-between p-4 md:p-8">
      {/* Paperlog Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-slate-800 mb-8">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Paperlog
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400">100% In-Browser PDF Optimization Engine</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden sm:inline">100% Client-Side Privacy</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl flex-1 flex flex-col justify-center">
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Step 1: Upload Dropzone */}
        {!file && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-800/40 hover:bg-slate-800/60 transition-all rounded-3xl p-12 text-center cursor-pointer flex flex-col items-center justify-center group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              accept="application/pdf"
              className="hidden"
            />
            <div className="p-4 bg-slate-800 group-hover:bg-indigo-600/20 border border-slate-700 group-hover:border-indigo-500/50 rounded-2xl mb-4 transition-all">
              <Upload className="w-10 h-10 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Upload PDF to Paperlog</h2>
            <p className="text-sm text-slate-400 mb-4 max-w-md">
              Drag & drop your document or browse your files. All compression happens directly inside your device RAM.
            </p>
            <span className="text-xs bg-slate-800 px-3 py-1 rounded-md text-slate-400 border border-slate-700">
              No size limits • Zero server uploads
            </span>
          </div>
        )}

        {/* Step 2: Dynamic Target Calculation */}
        {file && !result && (
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-700 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-slate-700/50 rounded-xl">
                  <FileText className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 truncate max-w-xs md:max-w-md">{file.name}</h3>
                  <p className="text-xs text-slate-400">
                    Original Size: <span className="text-slate-200 font-medium">{formatBytes(file.size)}</span> • {analysis?.pageCount || 0} Pages
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                disabled={isCompressing}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 self-start md:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change File</span>
              </button>
            </div>

            {isAnalyzing ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-slate-300">Paperlog is analyzing stream density & vector structure...</p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-300 flex items-center space-x-2 mb-3">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Select Achievable Output Target:</span>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysis?.targets.map((t) => {
                      const isSelected = selectedTarget?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => !isCompressing && setSelectedTarget(t)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                              : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-200">{t.label}</span>
                              <span className="text-xs bg-emerald-500/10 text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
                                ~{t.reductionPercentage}% Cut
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">{t.description}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-700/50 flex items-baseline justify-between">
                            <span className="text-xs text-slate-500">Est. Output:</span>
                            <span className="text-sm font-bold text-slate-100">{formatBytes(t.targetSizeBytes)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isCompressing ? (
                  <div className="space-y-3 pt-4 border-t border-slate-700/60">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{progress?.statusText}</span>
                      <span>{progress?.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress?.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleStartCompression}
                      className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
                    >
                      <span>Start Optimization</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Verified Results & Download */}
        {result && (
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-center space-x-3 text-emerald-400 mb-6">
              <CheckCircle2 className="w-7 h-7" />
              <h2 className="text-lg font-bold text-slate-100">PDF Successfully Optimized</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl">
                <span className="text-xs text-slate-400">Original Size</span>
                <p className="text-xl font-bold text-slate-200 mt-1">{formatBytes(result.originalSizeBytes)}</p>
              </div>
              <div className="bg-indigo-600/10 border border-indigo-500/40 p-4 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-indigo-300">Optimized Size</span>
                  <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md">
                    {Math.round(((result.originalSizeBytes - result.compressedSizeBytes) / result.originalSizeBytes) * 100)}% Saved
                  </span>
                </div>
                <p className="text-xl font-bold text-indigo-400 mt-1">{formatBytes(result.compressedSizeBytes)}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Optimized PDF</span>
              </button>
              <button
                onClick={handleReset}
                className="py-3 px-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Compress Another</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center text-xs text-slate-500 py-4 mt-8">
        Paperlog • Powered by Web Worker & HTML5 Canvas Pipeline
      </footer>
    </div>
  );
                          }
                          
