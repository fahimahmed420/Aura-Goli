import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

export interface UploadResult {
  url:       string;
  publicId:  string;
  width:     number;
  height:    number;
  format:    string;
  bytes:     number;
}

export async function uploadImage(
  source: string,            // base64 data URI or remote URL
  folder = "aura-goli/products",
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(source, {
    folder,
    resource_type: "image",
    transformation: [
      { quality: "auto:good", fetch_format: "auto" },
    ],
  });

  return {
    url:      result.secure_url,
    publicId: result.public_id,
    width:    result.width,
    height:   result.height,
    format:   result.format,
    bytes:    result.bytes,
  };
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
