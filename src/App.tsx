import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, ArrowRight, Download, RefreshCw, 
  Layers, ShieldCheck, Sparkles, Sliders, Zap, FileCheck, Lock, Eye
} from 'lucide-react';
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

  // Generate a live thumbnail preview of the first page
  const generatePreview = async (selectedFile: File) => {
    try {
      const buffer = await selectedFile.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 0.5 });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await firstPage.render({ canvasContext: ctx, viewport }).promise;
      setPreviewUrl(canvas.toDataURL());
    } catch (e) {
      console.warn('Could not generate preview thumbnail', e);
    }
  };

  const handleFileChange = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setErrorMessage('Please upload a valid PDF document.');
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
    setResult(null);
    setIsAnalyzing(true);
    generatePreview(selectedFile);

    try {
      const data = await analyzePDF(selectedFile);
      setAnalysis(data);
      setSelectedTarget(data.targets[1] || data.targets[0]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse PDF file structure.');
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
    if (!file) return;

    let targetToRun = selectedTarget;

    if (isCustomMode && analysis) {
      const qualityFactor = Math.max(0.3, 0.9 - (customRatio / 100) * 0.6);
      const scaleFactor = Math.max(0.9, 1.8 - (customRatio / 100) * 0.9);
      targetToRun = {
        id: 'custom',
        label: `Custom (~${customRatio}% Cut)`,
        description: 'User-configured custom ratio',
        targetSizeBytes: Math.max(file.size * (1 - customRatio / 100), 20000),
        reductionPercentage: customRatio,
        scaleFactor,
        quality: qualityFactor
      };
    }

    if (!targetToRun) return;

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const res = await compressPDF(file, targetToRun, (p) => setProgress(p));
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
    setPreviewUrl(null);
    setIsCustomMode(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-between p-4 sm:p-8 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Subtle Futuristic Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-200/40 to-blue-200/30 blur-[120px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 border-b border-slate-200/80 mb-8 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-md shadow-indigo-500/20 text-white flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Paperlog</h1>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                v2.0 Turbo
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Ultra-Fast Client-Side PDF Stream Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero Server Uploads</span>
        </div>
      </header>

      {/* Main App Container */}
      <main className="w-full max-w-5xl flex-1 flex flex-col justify-center z-10">
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* View 1: Clean Futuristic Dropzone */}
        {!file && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300/90 hover:border-indigo-500 bg-white hover:bg-slate-50/60 transition-all duration-200 rounded-3xl p-12 md:p-16 text-center cursor-pointer flex flex-col items-center justify-center shadow-xl shadow-slate-200/50 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              accept="application/pdf"
              className="hidden"
            />
            
            <div className="relative mb-6">
              <div className="absolute -inset-2 bg-indigo-500/10 rounded-full blur group-hover:scale-125 transition-all duration-300" />
              <div className="relative p-5 bg-white border border-slate-200 rounded-2xl shadow-md group-hover:scale-105 transition-transform duration-200">
                <Upload className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">Drop your PDF document here</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
              Experience instant hardware-accelerated compression without uploading files anywhere.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> In-Memory Processing
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-indigo-500" /> All PDF Formats
              </span>
            </div>
          </div>
        )}

        {/* View 2: Analysis & Configuration */}
        {file && !result && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-slate-200/60">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div className="flex items-center space-x-4">
                {previewUrl ? (
                  <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex-shrink-0 flex items-center justify-center">
                    <img src={previewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 truncate max-w-xs md:max-w-md">{file.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                    <span>Original: <strong className="text-slate-700">{formatBytes(file.size)}</strong></span>
                    <span>•</span>
                    <span>{analysis?.pageCount || 0} Pages</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleReset}
                disabled={isCompressing}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change File</span>
              </button>
            </div>

            {isAnalyzing ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <h4 className="font-semibold text-slate-800 mb-1">Pre-Analyzing Vector Trees</h4>
                <p className="text-xs text-slate-500">Estimating achievable target brackets and stream bounds...</p>
              </div>
            ) : (
              <div className="mt-8 space-y-8">
                {/* Mode Selector Tab */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Target Optimization Engine
                  </span>

                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                    <button
                      onClick={() => setIsCustomMode(false)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        !isCustomMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Smart Brackets
                    </button>
                    <button
                      onClick={() => setIsCustomMode(true)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        isCustomMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Custom Dial
                    </button>
                  </div>
                </div>

                {!isCustomMode ? (
                  /* Smart Dynamic Cards */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysis?.targets.map((t) => {
                      const isSelected = selectedTarget?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => !isCompressing && setSelectedTarget(t)}
                          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-50/50 border-indigo-600 shadow-md ring-1 ring-indigo-600'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-slate-900">{t.label}</span>
                              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                ~{t.reductionPercentage}% Cut
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">{t.description}</p>
                          </div>
                          <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                            <span className="text-xs font-medium text-slate-400">Target Size:</span>
                            <span className="text-sm font-extrabold text-slate-900">{formatBytes(t.targetSizeBytes)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Interactive Custom Slider */
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <span className="text-sm font-bold text-slate-900">Custom Target Reduction</span>
                        <p className="text-xs text-slate-500">Slide to configure custom downsampling intensity</p>
                      </div>
                      <span className="text-xl font-extrabold text-indigo-600 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-sm">
                        {customRatio}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="20"
                      max="90"
                      step="5"
                      value={customRatio}
                      onChange={(e) => setCustomRatio(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />

                    <div className="flex justify-between text-xs font-semibold text-slate-400 mt-2">
                      <span>Light (20%)</span>
                      <span>Balanced (50%)</span>
                      <span>Extreme (90%)</span>
                    </div>
                  </div>
                )}

                {/* Progress bar during compression */}
                {isCompressing ? (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{progress?.statusText}</span>
                      <span className="text-indigo-600 font-extrabold">{progress?.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress?.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleStartCompression}
                      className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Optimize Document</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* View 3: Optimized Results */}
        {result && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-slate-200/60">
            <div className="flex items-center space-x-3 text-emerald-600 mb-6">
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Optimization Complete</h2>
                <p className="text-xs text-slate-500 font-medium">Ready for high-speed download</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Before</span>
                <p className="text-2xl font-extrabold text-slate-700 mt-1">{formatBytes(result.originalSizeBytes)}</p>
              </div>
              <div className="bg-indigo-50/60 border border-indigo-200/80 p-5 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">After</span>
                  <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    {Math.round(((result.originalSizeBytes - result.compressedSizeBytes) / result.originalSizeBytes) * 100)}% Reduced
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-indigo-700 mt-1">{formatBytes(result.compressedSizeBytes)}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
          
