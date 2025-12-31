// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    const filename = `images/${Date.now()}-${safeName}`

    if (!hasBlobToken()) {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`
      return NextResponse.json({ url: dataUrl })
    }

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type || 'image/jpeg',
    })

    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
