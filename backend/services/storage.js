// Storage abstraction. Prioridad:
//   1) Cloudinary  -> si hay CLOUDINARY_URL (o CLOUD_NAME + API_KEY + API_SECRET)
//   2) Supabase    -> si hay SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//   3) Filesystem  -> local (UPLOADS_DIR), efimero en Render free
// Devuelve siempre { url, filename }. url absoluta (https) en Cloudinary/Supabase,
// relativa (/uploads/xxx) en modo local.

const fs = require('fs');
const path = require('path');

const useCloudinary = !!(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);
const useSupabase = !useCloudinary && !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'uploads';
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'campusnorma';

let cloudinary = null;
let supabaseClient = null;

if (useCloudinary) {
  cloudinary = require('cloudinary').v2;
  // Si esta CLOUDINARY_URL, el SDK se configura solo. Si no, usamos las 3 vars.
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  console.log(`📦 Storage: Cloudinary (folder: ${CLOUDINARY_FOLDER})`);
} else if (useSupabase) {
  const { createClient } = require('@supabase/supabase-js');
  supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`📦 Storage: Supabase (bucket: ${SUPABASE_BUCKET})`);
} else {
  console.log('📦 Storage: filesystem local (efimero en Render free)');
}

function genFilename(originalname) {
  const ext = (path.extname(originalname || '') || '').toLowerCase().replace(/[^.\w]/g, '');
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

// Sube un buffer + metadata. Devuelve { url, filename }.
async function uploadBuffer(buffer, originalname, mimetype, uploadsDir) {
  const filename = genFilename(originalname);

  if (useCloudinary) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: CLOUDINARY_FOLDER,
          resource_type: 'auto', // imagen / video / raw (pdf) automatico
          public_id: filename.replace(/\.[^.]+$/, ''),
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, filename: result.public_id };
  }

  if (useSupabase) {
    const { data, error } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .upload(filename, buffer, { contentType: mimetype, upsert: false });
    if (error) throw error;
    const { data: pub } = supabaseClient.storage.from(SUPABASE_BUCKET).getPublicUrl(data.path);
    return { url: pub.publicUrl, filename };
  }

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const fullPath = path.join(uploadsDir, filename);
  fs.writeFileSync(fullPath, buffer);
  return { url: `/uploads/${filename}`, filename };
}

module.exports = { uploadBuffer, useCloudinary, useSupabase };
