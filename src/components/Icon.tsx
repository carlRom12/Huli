import type { ItemIcon } from '../data/types'

type IconName = ItemIcon | 'plus' | 'settings' | 'check' | 'clock' | 'warning' | 'back' | 'edit' | 'more' | 'close'

const paths: Record<IconName, React.ReactNode> = {
  flame: <path d="M12 2c1 5 6 7 6 13a6 6 0 0 1-12 0c0-2 1-4 3-6 0 3 1 4 2 4 1-3 2-7 1-11Z" />,
  droplet: <path d="M12 2c3 4 7 8 7 13a7 7 0 0 1-14 0c0-5 4-9 7-13Z" />,
  wind: <path d="M3 8h12a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />,
  wrench: <path d="M14.5 6.5a4.5 4.5 0 0 1 5-4L16 6l2 2 3.5-3.5a4.5 4.5 0 0 1-5 5L6 20l-2-2L14.5 7.5Z" />,
  scissors: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="m8 8 12 12M8 16 20 4" /></>,
  home: <path d="M3 10 12 3l9 7v10H3Z" />,
  car: <><path d="m4 11 2-5h12l2 5v7H4Zm0 1h16M7 18v2m10-2v2" /><path d="M7 15h1m8 0h1" /></>,
  user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  tag: <path d="M12 3h8v8l-9 9-7-7Zm4 4h.01" />,
  plus: <path d="M12 4v16M4 12h16" />,
  settings: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  warning: <path d="M12 3 2 21h20ZM12 9v5m0 3h.01" />,
  back: <path d="m15 5-7 7 7 7" />,
  edit: <path d="m15 5 4 4M4 20l1-5L17 3l4 4L9 19Z" />,
  more: <path d="M5 12h.01m7 0h.01m7 0h.01" strokeWidth="3" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  )
}
