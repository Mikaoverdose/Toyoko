import { themes } from './themes'
import type { Theme } from './themes'

export default function ThemePicker({ theme, onChange, showLabels = false }: {
  theme: Theme
  onChange: (theme: Theme) => void
  showLabels?: boolean
}) {
  return (
    <div className={`theme-picker ${showLabels ? 'theme-picker-labeled' : ''}`} role="group" aria-label="Desk theme">
      {themes.map(({ id, label, swatch }) => (
        <button key={id} type="button" aria-label={`${label} theme`} aria-pressed={theme === id} onClick={() => onChange(id)}>
          <span className="swatch" style={{ backgroundColor: swatch }} />
          {showLabels && <span>{label}</span>}
        </button>
      ))}
    </div>
  )
}
