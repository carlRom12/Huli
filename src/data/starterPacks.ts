import type { ItemIcon } from './types'

export type Starter = {
  id: string
  name: string
  icon: ItemIcon
  defaultIntervalDays: number
  demoId?: string
}

export const starterPacks = {
  Home: [
    { id: 'starter:lpg', name: 'LPG tank', icon: 'flame', defaultIntervalDays: 35, demoId: 'lpg' },
    { id: 'starter:water-refill', name: 'Water refill (5 gal)', icon: 'droplet', defaultIntervalDays: 7, demoId: 'water' },
    { id: 'starter:aircon', name: 'Aircon cleaning', icon: 'wind', defaultIntervalDays: 90, demoId: 'aircon' },
    { id: 'starter:pest-control', name: 'Pest control', icon: 'home', defaultIntervalDays: 180 },
    { id: 'starter:smoke-detector', name: 'Smoke detector battery', icon: 'home', defaultIntervalDays: 365 },
    { id: 'starter:water-filter', name: 'Water filter', icon: 'droplet', defaultIntervalDays: 180 },
  ],
  Vehicle: [
    { id: 'starter:oil-change', name: 'Oil change', icon: 'wrench', defaultIntervalDays: 90, demoId: 'oil' },
    { id: 'starter:tire-pressure', name: 'Tire pressure', icon: 'car', defaultIntervalDays: 30 },
    { id: 'starter:registration', name: 'Registration', icon: 'car', defaultIntervalDays: 365 },
    { id: 'starter:car-wash', name: 'Car wash', icon: 'car', defaultIntervalDays: 14 },
  ],
  Personal: [
    { id: 'starter:haircut', name: 'Haircut', icon: 'scissors', defaultIntervalDays: 28, demoId: 'haircut' },
    { id: 'starter:dentist', name: 'Dentist', icon: 'user', defaultIntervalDays: 180 },
    { id: 'starter:eyeglasses', name: 'Eyeglasses check', icon: 'user', defaultIntervalDays: 365 },
    { id: 'starter:nail-trim', name: 'Nail trim', icon: 'scissors', defaultIntervalDays: 14 },
  ],
} satisfies Record<string, Starter[]>

export type PackName = keyof typeof starterPacks
