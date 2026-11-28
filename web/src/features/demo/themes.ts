export const themes = [
  { id: 'sky', label: 'Sky', swatch: '#a6d8ee' },
  { id: 'pink', label: 'Pink', swatch: '#f4c3cb' },
  { id: 'mint', label: 'Mint', swatch: '#a8e0c6' },
  { id: 'lavender', label: 'Lavender', swatch: '#cbc2f0' },
  { id: 'peach', label: 'Peach', swatch: '#f8c9a4' },
] as const

export type Theme = (typeof themes)[number]['id']

export function readTheme(): Theme {
  try {
    const savedTheme = localStorage.getItem('toyoko-theme')
    return themes.find(({ id }) => id === savedTheme)?.id ?? 'sky'
  } catch {
    return 'sky'
  }
}
