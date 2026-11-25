import { Brand } from './Brand'
import { Icon } from './Icon'

const tabs = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'add', label: 'Add', icon: 'plus' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
] as const

export type Tab = (typeof tabs)[number]['id']

export function Navigation({ active, onSelect, hideOnPhone }: {
  active: Tab
  onSelect: (tab: Tab) => void
  hideOnPhone: boolean
}) {
  return (
    <nav aria-label="Main navigation" className={`fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:static lg:block lg:overflow-y-auto lg:border-t-0 lg:border-r lg:px-4 lg:py-6 ${hideOnPhone ? 'hidden' : ''}`}>
      <div className="mb-6 hidden px-2 lg:block"><Brand /></div>
      <div className="mx-auto grid max-w-[488px] grid-cols-3 px-2 py-1.5 lg:grid-cols-1 lg:gap-2 lg:p-0">
        {tabs.map(({ id, label, icon }) => (
          <button key={id} type="button" aria-current={active === id ? 'page' : undefined}
            className="grid min-h-touch justify-items-center gap-0.5 rounded-button p-1 text-sm font-bold text-muted aria-[current=page]:text-ink lg:items-center lg:justify-items-start lg:px-4 lg:text-base lg:aria-[current=page]:bg-teal lg:aria-[current=page]:text-surface"
            onClick={() => onSelect(id)}>
            <span className={`grid h-8 w-14 place-items-center rounded-full lg:hidden ${active === id ? 'bg-teal text-surface' : ''}`}>
              <Icon name={icon} className="size-5" />
            </span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
