// lib/config.ts
import { list, put } from '@vercel/blob'
import type { Config } from './types'

const CONFIG_KEY = 'config/drinks-config.json'

const DEFAULT_CONFIG: Config = {
  categories: [
    { id: 'gin', name: 'Gin' },
    { id: 'whisky', name: 'Whisky' },
    { id: 'vodka', name: 'Vodka' },
  ],
  mixers: [
    { id: 'cola', name: 'Cola', isNonAlcoholicOption: true },
    { id: 'coke-zero', name: 'Coke Zero', isNonAlcoholicOption: true },
    { id: 'lemonade', name: 'Lemonade', isNonAlcoholicOption: true },
    { id: 'orange-juice', name: 'Orange Juice', isNonAlcoholicOption: true },
    { id: 'soda', name: 'Soda', isNonAlcoholicOption: true },
    { id: 'tonic', name: 'Tonic', isNonAlcoholicOption: false },
    { id: 'neat', name: 'Neat / no mixer', isNonAlcoholicOption: false },
  ],
  drinks: [
    {
      id: 'jack-daniels',
      name: "Jack Daniel's",
      categoryId: 'whisky',
      imageUrl: '',
      mixerIds: ['cola', 'coke-zero', 'soda', 'neat'],
    },
    {
      id: 'bombay-sapphire',
      name: 'Bombay Sapphire',
      categoryId: 'gin',
      imageUrl: '',
      mixerIds: ['tonic', 'soda', 'lemonade', 'neat'],
    },
    {
      id: 'smirnoff',
      name: 'Smirnoff',
      categoryId: 'vodka',
      imageUrl: '',
      mixerIds: ['orange-juice', 'lemonade', 'soda', 'neat'],
    },
  ],
}

export async function getConfig(): Promise<Config> {
  try {
    const { blobs } = await list({ prefix: CONFIG_KEY })
    if (!blobs.length) {
      // If no config yet, create one with defaults
      await put(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      })
      return DEFAULT_CONFIG
    }

    const blob = blobs[0]
    const res = await fetch(blob.url)
    if (!res.ok) throw new Error('Failed to fetch config blob')
    const json = (await res.json()) as Config
    return json
  } catch (err) {
    console.error('Error loading config, using defaults:', err)
    return DEFAULT_CONFIG
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await put(CONFIG_KEY, JSON.stringify(config, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}
