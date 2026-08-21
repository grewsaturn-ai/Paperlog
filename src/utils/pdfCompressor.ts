import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { PDFAnalysis, CompressionTarget, CompressionProgress, CompressionResult } from '../types';

// Configure standard CDN worker to prevent heavy bundle overhead
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Pre-analyzes document structure and calculates dynamic, realistic target sizes.
 */
export async function analyzePDF(file: File): Promise<PDFAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  const totalSizeBytes = file.size;
  const avgPageSizeBytes = totalSizeBytes / pageCount;

  // Inspect first 3 pages to estimate raster complexity
  let sampledImageCount = 0;
  const sampleLimit = Math.min(pageCount, 3);
  
  for (let i = 1; i <= sampleLimit; i++) {
    const page = await pdfDoc.getPage(i);
    const operatorList = await page.getOperatorList();
    for (let op of operatorList.fnArray) {
      if (op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintInlineImageXObject) {
        sampledImageCount++;
      }
    }
  }

  const isRasterHeavy = (sampledImageCount / sampleLimit) >= 1;
  const baseCompressionFloor = isRasterHeavy ? 0.08 : 0.25;

  const targets: CompressionTarget[] = [
    {
      id: 'max-compression',
      label: 'Ultra Small Target',
      description: 'Maximum downsampling for email attachments & strict web portals.',
      targetSizeBytes: Math.max(totalSizeBytes * baseCompressionFloor, pageCount * 45 * 1024),
      scaleFactor: 1.0,
      quality: 0.45,
      reductionPercentage: 0
    },
    {
      id: 'balanced',
      label: 'Balanced Optimization',
      description: 'Recommended balance between vector sharpness and reduced file size.',
      targetSizeBytes: Math.max(totalSizeBytes * (baseCompressionFloor * 2.2), pageCount * 120 * 1024),
      scaleFactor: 1.35,
      quality: 0.70,
      reductionPercentage: 0
    },
    {
      id: 'high-quality',
      label: 'Light Compression',
      description: 'Retains ultra-sharp rendering for print and detailed charts.',
      targetSizeBytes: Math.max(totalSizeBytes * 0.65, pageCount * 250 * 1024),
      scaleFactor: 1.8,
      quality: 0.85,
      reductionPercentage: 0
    }
  ].map((t) => {
    const targetSize = Math.min(t.targetSizeBytes, totalSizeBytes * 0.95);
    const reduction = Math.max(5, Math.round(((totalSizeBytes - targetSize) / totalSizeBytes) * 100));
    return {
      ...t,
      targetSizeBytes: targetSize,
      reductionPercentage: reduction
    };
  });

  return {
    pageCount,
    totalSizeBytes,
    avgPageSizeBytes,
    estimatedRasterDensity: isRasterHeavy ? 0.8 : 0.2,
    targets
  };
}

/**
 * Sequential, memory-safe in-browser compression pipeline.
 */
export async function compressPDF(
  file: File,
  target: CompressionTarget,
  onProgress: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = sourcePdf.numPages;

  const outputPdfDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress({
      currentPage: pageNum,
      totalPages,
      statusText: `Optimizing Page ${pageNum} of ${totalPages}...`,
      percentage: Math.round(((pageNum - 1) / totalPages) * 100)
    });

    const page = await sourcePdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: target.scaleFactor });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      throw new Error('Failed to acquire canvas rendering context.');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    const imageBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', target.quality);
    });

    if (!imageBlob) {
      throw new Error(`Failed to compress page image stream on page ${pageNum}`);
    }

    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const embeddedImage = await outputPdfDoc.embedJpg(imageArrayBuffer);

    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const newPage = outputPdfDoc.addPage([unscaledViewport.width, unscaledViewport.height]);
    
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: unscaledViewport.width,
      height: unscaledViewport.height
    });

    // Explicit memory cleanup
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();

    // Async microtask break to keep browser UI responsive
    await new Promise((r) => setTimeout(r, 15));
  }

  onProgress({
    currentPage: totalPages,
    totalPages,
    statusText: 'Finalizing PDF cross-reference streams...',
    percentage: 100
  });

  const pdfBytes = await outputPdfDoc.save({ useObjectStreams: true });
  
  // Create a clean ArrayBuffer copy to satisfy TypeScript's BlobPart definition
  const cleanBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  const compressedBlob = new Blob([cleanBuffer], { type: 'application/pdf' });

  return {
    blob: compressedBlob,
    originalSizeBytes: file.size,
    compressedSizeBytes: compressedBlob.size,
    fileName: `paperlog_optimized_${file.name}`
  };
}

