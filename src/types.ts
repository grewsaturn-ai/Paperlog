export interface PDFAnalysis {
  pageCount: number;
  totalSizeBytes: number;
  avgPageSizeBytes: number;
  estimatedRasterDensity: number; // Ratio 0.0 - 1.0
  targets: CompressionTarget[];
}

export interface CompressionTarget {
  id: string;
  label: string;
  description: string;
  targetSizeBytes: number;
  reductionPercentage: number;
  scaleFactor: number;
  quality: number;
}

export interface CompressionProgress {
  currentPage: number;
  totalPages: number;
  statusText: string;
  percentage: number;
}

export interface CompressionResult {
  blob: Blob;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  fileName: string;
}
