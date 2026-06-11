import { requireSession } from "@/lib/auth"
import { json, error } from "@/lib/api-utils"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// Lazy-load cloudinary only when env vars are present
async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<string> {
  const { v2: cloudinary } = await import("cloudinary")
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "chakkighar",
          public_id: filename,
          resource_type: "auto",
        },
        (err, result) => {
          if (err || !result) reject(err ?? new Error("Upload failed"))
          else resolve(result.secure_url)
        },
      )
      .end(buffer)
  })
}

async function uploadToLocal(buffer: Buffer, filename: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads")
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)
  return `/uploads/${filename}`
}

export async function POST(req: Request) {
  const session = await requireSession()
  if (!session) return error("Unauthorized", 401)

  const form = await req.formData().catch(() => null)
  const file = form?.get("file") as File | null
  if (!file) return error("No file provided")

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = path.extname(file.name) || ".jpg"
  const filename = `${session.userId}-${Date.now()}`

  let url: string

  const useCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET

  if (useCloudinary) {
    url = await uploadToCloudinary(buffer, filename)
  } else {
    // Dev fallback: save to public/uploads
    url = await uploadToLocal(buffer, `${filename}${ext}`)
  }

  return json({ url })
}
