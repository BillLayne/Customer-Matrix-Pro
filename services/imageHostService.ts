// BLI Image Host (img.billlayneinsurance.com) — replaces the old Imgur uploader.
// Optimizes in the browser (WebP, max 1600px) before uploading; GIF/SVG pass
// through untouched so animations and vectors survive.

const IMAGE_HOST_BASE = 'https://img.billlayneinsurance.com';
const ACCESS_CODE_STORAGE_KEY = 'bliImgAccessCode';

const MAX_WIDTH = 1600;
const WEBP_QUALITY = 0.82;
const PASSTHROUGH_TYPES = ['image/gif', 'image/svg+xml'];

export interface ImageHostUpload {
  key: string;
  url: string;
  size: number;
}

export const getAccessCode = (): string => {
  try {
    return window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const setAccessCode = (code: string): void => {
  try {
    window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code.trim());
  } catch {
    // Storage full/blocked — the code just won't persist across reloads.
  }
};

export const checkAccessCode = async (code: string): Promise<boolean> => {
  const response = await fetch(`${IMAGE_HOST_BASE}/api/check`, {
    headers: { 'x-access-code': code.trim() },
  });
  return response.ok;
};

interface OptimizedImage {
  blob: Blob;
  name: string;
  type: string;
}

const optimize = async (file: File): Promise<OptimizedImage> => {
  if (PASSTHROUGH_TYPES.includes(file.type)) {
    return { blob: file, name: file.name, type: file.type };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { blob: file, name: file.name, type: file.type };
  }

  const scale = bitmap.width > MAX_WIDTH ? MAX_WIDTH / bitmap.width : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
  );

  // Encoder unavailable, or the re-encode gained nothing at full size — keep the original.
  if (!blob || (scale === 1 && blob.size >= file.size)) {
    return { blob: file, name: file.name, type: file.type };
  }

  return {
    blob,
    name: file.name.replace(/\.[^.]*$/, '') + '.webp',
    type: 'image/webp',
  };
};

export const uploadImage = async (file: File): Promise<ImageHostUpload> => {
  const code = getAccessCode();
  if (!code) {
    throw new Error('Enter the image host access code first.');
  }

  const { blob, name, type } = await optimize(file);
  const response = await fetch(
    `${IMAGE_HOST_BASE}/api/upload?filename=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: { 'x-access-code': code, 'content-type': type },
      body: blob,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || `Upload failed (HTTP ${response.status}).`
    );
  }
  return data as ImageHostUpload;
};
