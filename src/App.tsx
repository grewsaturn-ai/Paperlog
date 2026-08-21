import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  FileCheck2,
  FileText,
  Gauge,
  Layers,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap,
  MousePointer2,
} from 'lucide-react';

import {
  analyzePDF,
  compressPDF,
  formatBytes,
} from './utils/pdfCompressor';

import {
  PDFAnalysis,
  CompressionTarget,
  CompressionProgress,
  CompressionResult,
} from './types';

const steps = [
  {
    number: '01',
    title: 'Drop your PDF',
    text: 'Choose a document or drag it into Paperlog.',
  },
  {
    number: '02',
    title: 'Choose your quality',
    text: 'Pick the balance between file size and quality.',
  },
  {
    number: '03',
    title: 'Download',
    text: 'Your optimized PDF is ready in seconds.',
  },
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PDFAnalysis | null>(null);
  const [selectedTarget, setSelectedTarget] =
    useState<CompressionTarget | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const [progress, setProgress] =
    useState<CompressionProgress | null>(null);

  const [result, setResult] =
    useState<CompressionResult | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    if (
      selectedFile.type !== 'application/pdf' &&
      !selectedFile.name.toLowerCase().endsWith('.pdf')
    ) {
      setErrorMessage('Please choose a valid PDF file.');
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);
    setResult(null);
    setAnalysis(null);
    setSelectedTarget(null);
    setProgress(null);
    setIsAnalyzing(true);

    try {
      const data = await analyzePDF(selectedFile);

      setAnalysis(data);

      setSelectedTarget(
        data.targets[1] ||
          data.targets[0] ||
          null
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to analyze the PDF.'
      );

      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      void handleFileChange(droppedFile);
    }
  };

  const handleStartCompression = async () => {
    if (!file || !selectedTarget) {
      return;
    }

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const compressed = await compressPDF(
        file,
        selectedTarget,
        setProgress
      );

      setResult(compressed);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Compression failed.'
      );
    } finally {
      setIsCompressing(false);
      setProgress(null);
    }
  };

  const handleDownload = () => {
    if (!result) {
      return;
    }

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = result.fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setSelectedTarget(null);
    setResult(null);
    setProgress(null);
    setErrorMessage(null);
    setIsDragging(false);
    setIsAnalyzing(false);
    setIsCompressing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const savedPercent = result
    ? Math.max(
        0,
        Math.round(
          ((result.originalSizeBytes -
            result.compressedSizeBytes) /
            result.originalSizeBytes) *
            100
        )
      )
    : 0;

  return (
    <div className="app-shell">
      <div className="background-grid" />
      <div className="orb orb-blue" />
      <div className="orb orb-purple" />

      <header className="site-header">
        <div className="container header-inner">
          <button
            className="brand"
            onClick={handleReset}
            aria-label="Paperlog home"
            type="button"
          >
            <span className="brand-mark">
              <Layers size={19} strokeWidth={2.4} />
            </span>

            <span className="brand-text">
              <span className="brand-name">paperlog</span>
              <span className="brand-subtitle">
                PDF optimizer
              </span>
            </span>
          </button>

          <div className="privacy-pill">
            <span className="status-dot" />
            <ShieldCheck size={15} />
            <span>100% local processing</span>
          </div>
        </div>
      </header>

      <main>
        <section className="hero container">
          <div className="eyebrow">
            <Sparkles size={14} />
            <span>Fast · Private · Browser-based</span>
          </div>

          <h1>
            Compress PDFs.
            <br />
            <span>Without the compromise.</span>
          </h1>

          <p className="hero-copy">
            Reduce PDF file size while keeping
            your documents sharp, readable and
            ready to send.
          </p>

          {!file && (
            <div className="workspace-card">
              <div
                className={`dropzone ${
                  isDragging ? 'is-dragging' : ''
                }`}
                onDrop={handleDrop}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(event) => {
                    const selected =
                      event.target.files?.[0];

                    if (selected) {
                      void handleFileChange(selected);
                    }
                  }}
                />

                <div className="upload-icon">
                  <Upload size={25} />
                </div>

                <div className="dropzone-title">
                  {isDragging
                    ? 'Release your PDF'
                    : 'Drop your PDF here'}
                </div>

                <div className="dropzone-text">
                  or click anywhere to browse
                </div>

                <div className="upload-action">
                  <MousePointer2 size={13} />
                  Choose PDF
                </div>

                <div className="dropzone-meta">
                  <span>PDF files</span>
                  <span>•</span>
                  <span>Processed on your device</span>
                </div>
              </div>

              <div className="feature-row">
                <div>
                  <LockKeyhole size={16} />
                  <span>Private</span>
                </div>

                <div>
                  <Zap size={16} />
                  <span>Fast</span>
                </div>

                <div>
                  <Gauge size={16} />
                  <span>3 quality modes</span>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="error-banner" role="alert">
              <span>{errorMessage}</span>

              <button
                type="button"
                onClick={() => setErrorMessage(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {file && !result && (
            <section className="workspace-card editor-card">
              <div className="file-heading">
                <div className="file-icon">
                  <FileText size={21} />
                </div>

                <div className="file-info">
                  <strong title={file.name}>
                    {file.name}
                  </strong>

                  <span>
                    {formatBytes(file.size)}
                    <b>•</b>
                    {analysis?.pageCount ?? '—'} pages
                  </span>
                </div>

                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleReset}
                  disabled={isCompressing}
                >
                  <RefreshCw size={14} />
                  Change
                </button>
              </div>

              {isAnalyzing ? (
                <div className="analysis-state">
                  <div className="loader" />

                  <strong>
                    Analyzing your PDF
                  </strong>

                  <span>
                    Inspecting pages and calculating
                    compression options…
                  </span>
                </div>
              ) : (
                <>
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">
                        Compression
                      </span>

                      <h2>
                        Choose your balance
                      </h2>
                    </div>

                    <span className="recommended">
                      <Sparkles size={13} />
                      Recommended: Balanced
                    </span>
                  </div>

                  <div className="target-grid">
                    {analysis?.targets.map(
                      (target, index) => {
                        const selected =
                          selectedTarget?.id === target.id;

                        const label =
                          index === 0
                            ? 'Maximum compression'
                            : index === 1
                            ? 'Recommended'
                            : 'Maximum quality';

                        return (
                          <button
                            type="button"
                            key={target.id}
                            onClick={() => {
                              if (!isCompressing) {
                                setSelectedTarget(target);
                              }
                            }}
                            className={`target-card ${
                              selected ? 'selected' : ''
                            }`}
                          >
                            <div className="target-top">
                              <span className="target-label">
                                {label}
                              </span>

                              {selected && (
                                <span className="selected-check">
                                  <Check size={12} />
                                </span>
                              )}
                            </div>

                            <h3>{target.label}</h3>

                            <p>{target.description}</p>

                            <div className="target-bottom">
                              <span>
                                Estimated output
                              </span>

                              <strong>
                                {formatBytes(
                                  target.targetSizeBytes
                                )}
                              </strong>
                            </div>

                            <div className="target-save">
                              ~{target.reductionPercentage}%
                              {' '}smaller
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {isCompressing ? (
                    <div className="progress-box">
                      <div className="progress-label">
                        <span>
                          {progress?.statusText ??
                            'Optimizing PDF…'}
                        </span>

                        <strong>
                          {progress?.percentage ?? 0}%
                        </strong>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${
                              progress?.percentage ?? 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="action-row">
                      <div className="action-note">
                        <ShieldCheck size={17} />

                        <span>
                          Your file never leaves
                          this browser.
                        </span>
                      </div>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleStartCompression}
                        disabled={!selectedTarget}
                      >
                        Compress PDF
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {result && (
            <section className="workspace-card result-card">
              <div className="success-icon">
                <CheckCircle2 size={28} />
              </div>

              <span className="section-kicker success-kicker">
                Compression complete
              </span>

              <h2>Your PDF is ready.</h2>

              <p className="result-file">
                <FileCheck2 size={15} />
                {result.fileName}
              </p>

              <div className="result-stats">
                <div>
                  <span>Original</span>

                  <strong>
                    {formatBytes(
                      result.originalSizeBytes
                    )}
                  </strong>
                </div>

                <div>
                  <span>Optimized</span>

                  <strong>
                    {formatBytes(
                      result.compressedSizeBytes
                    )}
                  </strong>
                </div>

                <div>
                  <span>You saved</span>

                  <strong>{savedPercent}%</strong>
                </div>
              </div>

              <div className="result-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleDownload}
                >
                  <Download size={17} />
                  Download PDF
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleReset}
                >
                  <RefreshCw size={16} />
                  Compress another
                </button>
              </div>
            </section>
          )}
        </section>

        <section className="steps-section">
          <div className="container">
            <div className="section-intro">
              <span className="section-kicker">
                How it works
              </span>

              <h2>Simple by design.</h2>
            </div>

            <div className="steps-grid">
              {steps.map((step, index) => (
                <div
                  className="step"
                  key={step.number}
                >
                  <span className="step-number">
                    {step.number}
                  </span>

                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>

                  {index < steps.length - 1 && (
                    <ChevronRight
                      className="step-arrow"
                      size={18}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="trust-section container">
          <div className="trust-card">
            <div className="trust-icon">
              <LockKeyhole size={20} />
            </div>

            <div>
              <strong>
                Your documents stay on your device.
              </strong>

              <span>
                Paperlog processes your PDF directly
                inside your browser. No upload queue,
                no cloud storage and no account required.
              </span>
            </div>

            <ShieldCheck
              className="trust-check"
              size={22}
            />
          </div>
        </section>
      </main>

      <footer className="footer container">
        <span>paperlog © 2026</span>
        <span>Private PDF optimization</span>
      </footer>
    </div>
  );
}
