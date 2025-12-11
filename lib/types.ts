// lib/types.ts

export type Category = {
  id: string
  name: string
}

export type Mixer = {
  id: string
  name: string
  isNonAlcoholicOption: boolean
}

export type Drink = {
  id: string
  name: string
  categoryId: string
  imageUrl?: string
  mixerIds: string[]
}

export type Config = {
  categories: Category[]
  mixers: Mixer[]
  drinks: Drink[]
}
