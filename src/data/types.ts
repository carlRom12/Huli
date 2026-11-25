export const itemIcons = [
  'flame', 'droplet', 'wind', 'wrench', 'scissors',
  'home', 'car', 'user', 'tag',
] as const

export type ItemIcon = (typeof itemIcons)[number]

export type Item = {
  id: string
  name: string
  icon: ItemIcon
  defaultIntervalDays: number
  createdAt: number
}

export type Log = {
  id: string
  itemId: string
  doneOn: string
  createdAt: number
}
