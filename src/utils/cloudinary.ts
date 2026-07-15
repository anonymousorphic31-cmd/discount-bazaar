import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set in the environment.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  configured = true;
}

/**
 * Uploads a file buffer (from multer memoryStorage) to Cloudinary
 * using upload_stream, which accepts a Buffer directly — no temp file needed.
 * Returns the secure URL of the uploaded asset.
 */
export async function uploadToCloudinary(
  file: Express.Multer.File,
  resourceType: "image" | "video" = "image",
): Promise<string> {
  ensureConfigured();

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "discountbazaar",
        resource_type: resourceType,
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary returned no result."));
          return;
        }
        resolve(result.secure_url);
      },
    );

    // Write the buffer into the stream
    stream.end(file.buffer);
  });
}

export { ensureConfigured };
