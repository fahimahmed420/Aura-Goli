import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { apiError } from "@/lib/validation";
import { uploadImage, deleteImage } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const body = await req.json();
  const { image, folder } = body as { image?: string; folder?: string };

  if (!image) return apiError("No image provided", 400);

  const isBase64 = image.startsWith("data:");
  const isUrl    = image.startsWith("http");
  if (!isBase64 && !isUrl) return apiError("Image must be a base64 data URI or URL", 400);

  const result = await uploadImage(image, folder ?? "aura-goli/products");

  return Response.json({
    url:      result.url,
    publicId: result.publicId,
    width:    result.width,
    height:   result.height,
    format:   result.format,
    bytes:    result.bytes,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof Response) return auth;

  const { publicId } = await req.json() as { publicId?: string };
  if (!publicId) return apiError("No publicId provided", 400);

  await deleteImage(publicId);
  return Response.json({ success: true });
}
