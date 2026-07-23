// BLI Image Host (img.billlayneinsurance.com) — replaces the old Imgur uploader.
// Optimizes in the browser to the chosen preset before uploading; GIF/SVG pass
// through untouched so animations and vectors survive.

const IMAGE_HOST_BASE = 'https://img.billlayneinsurance.com';
const ACCESS_CODE_STORAGE_KEY = 'bliImgAccessCode';

const PASSTHROUGH_TYPES = ['image/gif', 'image/svg+xml'];

export type ImagePresetId = 'gmail' | 'logo' | 'web' | 'original';

export interface ImagePreset {
  id: ImagePresetId;
  label: string;
  hint: string;
  icon: string;
  /** Target mime type; undefined = upload the file untouched. */
  type?: 'image/jpeg' | 'image/png' | 'image/webp';
  maxWidth?: number;
  quality?: number;
}

export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    hint: 'JPEG · 1200px — renders in every email client, including old Outlook',
    icon: 'fa-envelope',
    type: 'image/jpeg',
    maxWidth: 1200,
    quality: 0.8,
  },
  {
    id: 'logo',
    label: 'Logo',
    hint: 'PNG — keeps transparency and sharp edges',
    icon: 'fa-shapes',
    type: 'image/png',
  },
  {
    id: 'web',
    label: 'Web',
    hint: 'WebP · 1600px — smallest files for web pages and quotes',
    icon: 'fa-globe',
    type: 'image/webp',
    maxWidth: 1600,
    quality: 0.82,
  },
  {
    id: 'original',
    label: 'GIF / Original',
    hint: 'Uploads the file exactly as-is (use for GIFs and SVGs)',
    icon: 'fa-film',
  },
];

const EXTENSION_FOR_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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

const optimize = async (file: File, preset: ImagePreset): Promise<OptimizedImage> => {
  const asOriginal: OptimizedImage = { blob: file, name: file.name, type: file.type };

  // GIF/SVG re-encoding would kill animation/vectors, so they always pass through.
  if (!preset.type || PASSTHROUGH_TYPES.includes(file.type)) {
    return asOriginal;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return asOriginal;
  }

  const maxWidth = preset.maxWidth ?? 0;
  const scale = maxWidth && bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx && preset.type === 'image/jpeg') {
    // JPEG has no alpha channel — flatten transparency onto white.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, preset.type, preset.quality)
  );

  // Encoder unavailable, or the re-encode gained nothing at full size — keep the original.
  if (!blob || (scale === 1 && blob.size >= file.size)) {
    return asOriginal;
  }

  return {
    blob,
    name: file.name.replace(/\.[^.]*$/, '') + '.' + EXTENSION_FOR_TYPE[preset.type],
    type: preset.type,
  };
};

export const uploadImage = async (file: File, preset: ImagePreset): Promise<ImageHostUpload> => {
  const code = getAccessCode();
  if (!code) {
    throw new Error('Enter the image host access code first.');
  }

  const { blob, name, type } = await optimize(file, preset);
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
