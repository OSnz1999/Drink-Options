// app/api/config/route.ts
import { NextResponse } from 'next/server'
import { getConfig, saveConfig } from '@/lib/config'
import type { Config } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const config = await getConfig()
  return NextResponse.json(config)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Config

    if (
      !body ||
      !Array.isArray(body.categories) ||
      !Array.isArray(body.mixers) ||
      !Array.isArray(body.drinks)
    ) {
      return NextResponse.json(
        { error: 'Invalid config shape' },
        { status: 400 }
      )
    }

    const normalized: Config = {
      ...body,
      events: Array.isArray(body.events)
        ? body.events.map((ev) => ({
            ...ev,
            drinkIds: Array.isArray((ev as any).drinkIds) ? (ev as any).drinkIds : [],
            nonAlcoholicMixerIds: Array.isArray((ev as any).nonAlcoholicMixerIds)
              ? (ev as any).nonAlcoholicMixerIds
              : [],
          }))
        : [],
      bookings: Array.isArray(body.bookings) ? body.bookings : [],
    }

    await saveConfig(normalized)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    )
  }
}
