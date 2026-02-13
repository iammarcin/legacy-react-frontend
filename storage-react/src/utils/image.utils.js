// utils/image.utils.js

// resize image before S3 upload
import imageCompression from 'browser-image-compression';

const resizeImage = async (file) => {
  const options = {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1092,
    useWebWorker: true,
  };
  try {
    const compressedBlob = await imageCompression(file, options);
    const resizedFile = new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: Date.now()
    });
    return resizedFile;
  } catch (error) {
    console.error('Error resizing image:', error);
    return file;
  }
};

export { resizeImage };