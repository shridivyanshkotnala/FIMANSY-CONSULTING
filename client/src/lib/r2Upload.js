// export const uploadToR2 = async (file, getUploadUrl, onProgress) => {

//   // 1️⃣ ask backend permission
//   const { uploadUrl, fileUrl } = await getUploadUrl({
//     fileName: file.name,
//     contentType: file.type,
//   }).unwrap();

//   // 2️⃣ upload with progress tracking
//   await new Promise((resolve, reject) => {
//     const xhr = new XMLHttpRequest();

//     xhr.open("PUT", uploadUrl);

//     xhr.setRequestHeader("Content-Type", file.type);

//     xhr.upload.onprogress = (event) => {
//       if (event.lengthComputable && onProgress) {
//         const percent = Math.round((event.loaded / event.total) * 100);
//         onProgress(percent);
//       }
//     };

//     xhr.onload = () => {
//       if (xhr.status >= 200 && xhr.status < 300) resolve();
//       else reject(new Error("Upload failed"));
//     };

//     xhr.onerror = () => reject(new Error("Network error"));

//     xhr.send(file);
//   });

//   return fileUrl;
// };



import { supabase } from "./supabase";

export const uploadInvoice = async (file, userId) => {
  const filePath = `${userId}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("invoices")
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("invoices")
    .getPublicUrl(filePath);

  return data.publicUrl;
};
