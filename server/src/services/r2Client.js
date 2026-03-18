import { S3Client } from "@aws-sdk/client-s3";

const normalizeUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

const endpoint = normalizeUrl(process.env.R2_ENDPOINT);

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});
