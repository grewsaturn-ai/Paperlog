import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, ArrowRight, Download, RefreshCw, Layers, ShieldCheck, Sparkles, Zap, FileCheck, Lock } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { analyzePDF, compressPDF, formatBytes } from './utils/pdfCompressor';
import { PDFAnalysis, CompressionTarget, CompressionProgress, CompressionResult } from './types';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PDFAnalysis | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<CompressionTarget | null>(null);
  const [customRatio, setCustomRatio] = useState<number>(60);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<CompressionProgress | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generatePreview = async (selectedFile: File) => {
    try {
      const buffer = await selectedFile.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      setPreviewUrl(canvas.toDataURL());
    } catch {
      // Ignore preview errors
    }
  };

  const handleFileChange = async (f: File) => {
    if (f.type !== 'application/pdf') {
      setErrorMessage('Please upload a valid PDF document.');
      return;
    }
    setErrorMessage(null);
    setFile(f);
    setResult(null);
    setIsAnalyzing(true);
    generatePreview(f);

    try {
      const data = await analyzePDF(f);
      setAnalysis(data);
      setSelectedTarget(data.targets[1] || data.targets[0]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse PDF.');
      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartCompression = async () => {
    if (!file) return;
    let target = selectedTarget;
    if (isCustomMode && analysis) {
      target = {
        id: 'custom',
        label: `Custom (${customRatio}%)`,
        description: 'User-configured custom compression ratio',
        targetSizeBytes: Math.max(file.size * (1 - customRatio / 100), 20000),
        reductionPercentage: customRatio,
        scaleFactor: Math.max(0.9, 1.8 - (customRatio / 100) * 0.9),
        quality: Math.max(0.3, 0.9 - (customRatio / 100) * 0.6)
      };
    }
    if (!target) return;
    setIsCompressing(true);
    setErrorMessage(null);
    try {
      const res = await compressPDF(file, target, (p) => setProgress(p));
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
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setSelectedTarget(null);
    setResult(null);
    setProgress(null);
    setErrorMessage(null);
    setPreviewUrl(null);
    setIsCustomMode(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />
      
      {/* Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-4 border-b border-slate-200 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-md text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Paperlog</h1>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">v2.0 Turbo</span>
            </div>
            <p className="text-xs text-slate-500">In-Browser PDF Compression Engine</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero Server Uploads</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-6 z-10">
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* View 1: Upload */}
        {!file && (
          <div
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-slate-50/50 transition-all rounded-3xl p-10 md:p-14 text-center cursor-pointer flex flex-col items-center justify-center shadow-xl shadow-slate-200/50"
          >
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} accept="application/pdf" className="hidden" />
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4 text-indigo-600 shadow-sm">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Drop your PDF document here</h2>
            <p className="text-sm text-slate-500 mb-5 max-w-md">Instant hardware-accelerated compression inside device RAM.</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> In-Memory Processing
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-indigo-500" /> All PDF Formats
              </span>
            </div>
          </div>
        )}

        {/* View 2: Controls */}
        {file && !result && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-100 gap-4">
              <div className="flex items-center space-x-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="Thumb" className="w-12 h-14 object-cover rounded-lg border border-slate-200 shadow-sm" />
                ) : (
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><FileText className="w-6 h-6" /></div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 truncate max-w-xs">{file.name}</h3>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)} • {analysis?.pageCount || 0} Pages</p>
                </div>
              </div>
              <button onClick={handleReset} disabled={isCompressing} className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Change
              </button>
            </div>

            {isAnalyzing ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-slate-500">Analyzing document structure...</p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Select Target
                  </span>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setIsCustomMode(false)} className={`text-xs font-bold px-3 py-1 rounded-lg ${!isCustomMode ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Smart</button>
                    <button onClick={() => setIsCustomMode(true)} className={`text-xs font-bold px-3 py-1 rounded-lg ${isCustomMode ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Custom</button>
                  </div>
                </div>

                {!isCustomMode ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {analysis?.targets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => !isCompressing && setSelectedTarget(t)}
                        className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                          selectedTarget?.id === t.id ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-900">{t.label}</span>
                            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">~{t.reductionPercentage}%</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">{t.description}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-900">Target: {formatBytes(t.targetSizeBytes)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-slate-800">Reduction Intensity</span>
                      <span className="text-lg font-extrabold text-indigo-600 bg-white px-3 py-0.5 rounded-lg border">{customRatio}%</span>
                    </div>
                    <input type="range" min="20" max="90" step="5" value={customRatio} onChange={(e) => setCustomRatio(Number(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" />
                  </div>
                )}

                {isCompressing ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{progress?.statusText}</span>
                      <span className="text-indigo-600">{progress?.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all" style={{ width: `${progress?.percentage || 0}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-2">
                    <button onClick={handleStartCompression} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                      <span>Optimize Document</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* View 3: Result */}
        {result && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center space-x-2 text-emerald-600 mb-5">
              <CheckCircle2 className="w-6 h-6" />
              <h2 className="text-lg font-bold text-slate-900">Optimization Complete</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-xs text-slate-500 font-semibold uppercase">Before</span>
                <p className="text-xl font-bold text-slate-700 mt-1">{formatBytes(result.originalSizeBytes)}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-indigo-600 font-semibold uppercase">After</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    {Math.round(((result.originalSizeBytes - result.compressedSizeBytes) / result.originalSizeBytes) * 100)}% Cut
                  </span>
                </div>
                <p className="text-xl font-bold text-indigo-700 mt-1">{formatBytes(result.compressedSizeBytes)}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleDownload} className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                <Download className="w-4 h-4" />
                <span>Download Optimized Document</span>
              </button>
              <button onClick={handleReset} className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5">
                <RefreshCw className="w-4 h-4" />
                <span>Compress Another</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-400 py-4 border-t border-slate-200 z-10">
        <span>Paperlog Engine • In-Browser Architecture</span>
        <span className="flex items-center gap-1 text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Private & Local
        </span>
      </footer>
    </div>
  );
                      }
