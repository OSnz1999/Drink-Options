// lib/config.ts
import { list, put } from '@vercel/blob'
 import { mkdir, readFile, writeFile } from 'node:fs/promises'
 import path from 'node:path'
import type { Config } from './types'

const CONFIG_KEY = 'config/drinks-config.json'
 const LOCAL_CONFIG_PATH = path.join(process.cwd(), '.data', 'drinks-config.json')

const DEFAULT_CONFIG: Config = {
  categories: [],
  mixers: [],
  drinks: [],
  events: [],
  bookings: [],
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

async function readLocalConfig(): Promise<Config | null> {
  try {
    const raw = await readFile(LOCAL_CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Config
    if (
      !parsed ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.mixers) ||
      !Array.isArray(parsed.drinks)
    ) {
      return null
    }
    return normalizeConfig(parsed)
  } catch {
    return null
  }
}

function normalizeConfig(input: Config): Config {
  const rawEvents = Array.isArray((input as Config).events) ? (input as Config).events : []

  return {
    ...input,
    events: rawEvents.map((ev) => ({
      ...ev,
      drinkIds: Array.isArray((ev as any).drinkIds) ? (ev as any).drinkIds : [],
      nonAlcoholicMixerIds: Array.isArray((ev as any).nonAlcoholicMixerIds)
        ? (ev as any).nonAlcoholicMixerIds
        : [],
    })),
    bookings: Array.isArray((input as Config).bookings)
      ? (input as Config).bookings
      : [],
  }
}

async function writeLocalConfig(config: Config): Promise<void> {
  await mkdir(path.dirname(LOCAL_CONFIG_PATH), { recursive: true })
  await writeFile(LOCAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
}

export async function getConfig(): Promise<Config> {
  try {
    if (!hasBlobToken()) {
      const local = await readLocalConfig()
      if (local) return local
      await writeLocalConfig(DEFAULT_CONFIG)
      return DEFAULT_CONFIG
    }

    const { blobs } = await list({ prefix: CONFIG_KEY })

    if (!blobs.length) {
      // Create default config safely (overwrite allowed)
      await put(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true, // ✅ critical
      })
      return DEFAULT_CONFIG
    }

    const blob = blobs[0]
    const res = await fetch(blob.url, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch config blob')

    return normalizeConfig((await res.json()) as Config)
  } catch (err) {
    console.error('Error loading config, using defaults:', err)
    return DEFAULT_CONFIG
  }
}

export async function saveConfig(config: Config): Promise<void> {
  if (!hasBlobToken()) {
    await writeLocalConfig(config)
    return
  }

  await put(CONFIG_KEY, JSON.stringify(config, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true, // ✅ THIS FIXES YOUR ERROR
  })
}
