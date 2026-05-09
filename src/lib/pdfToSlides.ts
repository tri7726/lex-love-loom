/**
 * PDF → Image Slides Converter
 * Dùng pdfjs-dist để render từng trang PDF thành base64 PNG,
 * rồi upload lên Supabase Storage bucket 'lesson-images'.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '@/integrations/supabase/client';

// Set worker path — Vite sẽ phục vụ file này từ node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface PdfPageResult {
  pageNumber: number;
  imageUrl: string;   // Public URL trong Supabase Storage
  dataUrl?: string;   // Fallback nếu upload thất bại
}

export interface PdfConvertOptions {
  scale?: number;           // Default 1.5 — cân bằng chất lượng/dung lượng
  maxPages?: number;        // Giới hạn trang, default 50
  onProgress?: (current: number, total: number) => void;
  lessonId: string;         // Dùng để tạo folder trong Storage
}

/**
 * Convert PDF file → array of image URLs (Supabase Storage)
 */
export async function convertPdfToSlides(
  file: File,
  options: PdfConvertOptions
): Promise<PdfPageResult[]> {
  const { scale = 1.5, maxPages = 50, onProgress, lessonId } = options;

  // Đọc file thành ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const totalPages = Math.min(pdfDoc.numPages, maxPages);
  const results: PdfPageResult[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Render lên canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert sang blob PNG
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
    });

    // Upload lên Supabase Storage
    const filePath = `lessons/${lessonId}/page_${String(pageNum).padStart(3, '0')}.jpg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lesson-images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    let imageUrl = '';
    if (uploadError) {
      // Fallback: dùng data URL tạm thời nếu Storage chưa setup
      imageUrl = canvas.toDataURL('image/jpeg', 0.85);
      console.warn(`Storage upload failed for page ${pageNum}, using data URL fallback:`, uploadError.message);
    } else {
      const { data: urlData } = supabase.storage
        .from('lesson-images')
        .getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }

    results.push({
      pageNumber: pageNum,
      imageUrl,
    });

    // Cleanup canvas memory
    canvas.width = 0;
    canvas.height = 0;
  }

  return results;
}

/**
 * Upload một ảnh đơn lẻ (để GV upload ảnh vào content slide)
 */
export async function uploadSlideImage(
  file: File,
  lessonId: string,
  slideId: string
): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `lessons/${lessonId}/slide_${slideId}.${ext}`;

  const { data, error } = await supabase.storage
    .from('lesson-images')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    console.error('Upload image error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('lesson-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
