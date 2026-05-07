import fs from 'fs';
import path from 'path';
import { AppError } from '../middlewares/error';

// ─── Cloudinary upload (if configured) ───────────────────────────────────────
// Falls back to local storage in development if CLOUDINARY_URL is not set

let cloudinary: any = null;

const getCloudinary = async () => {
  if (cloudinary) return cloudinary;
  if (!process.env.CLOUDINARY_CLOUD_NAME) return null;

  try {
    const { v2 } = await import('cloudinary');
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinary = v2;
    return cloudinary;
  } catch {
    return null;
  }
};

export const uploadDocument = async (
  filePath: string,
  folder: string,
  publicId?: string
): Promise<string> => {
  const cld = await getCloudinary();

  // Production: upload to Cloudinary
  if (cld) {
    const result = await cld.uploader.upload(filePath, {
      folder: `payflow/kyc/${folder}`,
      public_id: publicId,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good', fetch_format: 'auto' },
        { width: 1200, crop: 'limit' }, // Max 1200px wide
      ],
    });
    // Clean up temp file
    fs.unlinkSync(filePath);
    return result.secure_url;
  }

  // Development fallback: serve from /uploads/
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${path.basename(filePath)}`;
  const dest = path.join(uploadsDir, filename);
  fs.copyFileSync(filePath, dest);
  fs.unlinkSync(filePath);

  // Return a local URL (served via static middleware in dev)
  return `/uploads/${filename}`;
};

export const deleteDocument = async (url: string) => {
  const cld = await getCloudinary();
  if (!cld || !url.includes('cloudinary')) return;

  // Extract public_id from URL
  const parts = url.split('/');
  const filename = parts[parts.length - 1].split('.')[0];
  const folder = parts[parts.length - 2];
  await cld.uploader.destroy(`${folder}/${filename}`).catch(console.error);
};
