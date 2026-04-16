import type { ImgurUploadResponse } from '../types';
import { IMGUR_CLIENT_ID, IMGUR_UPLOAD_URL } from '../constants';

export const uploadImage = async (image: File | string): Promise<ImgurUploadResponse['data']> => {
  const formData = new FormData();

  if (typeof image === 'string' && image.startsWith('data:')) {
    const base64Image = image.split(',')[1];
    formData.append('image', base64Image);
    formData.append('type', 'base64');
  } else {
    formData.append('image', image);
  }

  const response = await fetch(IMGUR_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
    },
    body: formData,
  });

  const data: ImgurUploadResponse = await response.json();

  if (!response.ok || !data.success) {
    const errorMessage = (data.data as { error?: string | { message?: string } })?.error;
    const formattedMessage =
      typeof errorMessage === 'object' ? errorMessage.message : errorMessage;
    throw new Error(formattedMessage || 'Failed to upload image to Imgur.');
  }

  return data.data;
};
