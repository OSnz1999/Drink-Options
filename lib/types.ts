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

export type Event = {
  id: string
  name: string
  drinkIds: string[]
  nonAlcoholicMixerIds: string[]
}

export type Booking = {
  id: string
  eventId: string
  createdAt: string
  guestName?: string
  isAlcoholicChoice: boolean
  drinkId?: string
  mixerId?: string
  summaryText: string
}

export type Config = {
  categories: Category[]
  mixers: Mixer[]
  drinks: Drink[]
  events: Event[]
  bookings: Booking[]
}
