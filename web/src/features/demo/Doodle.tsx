type Motif = 'cat' | 'mug' | 'plant' | 'sparkle' | 'controller' | 'disk' | 'slime'

// The line art follows the original Sticker Desk canvas.
const art = {
  cat: <>
    <path d="M6 13 7 4l6 5q3-1 6 0l6-5 1 9q2 13-10 14Q4 26 6 13z" fill="var(--color-tint-2)" />
    <circle cx="12" cy="16" r="1.1" fill="currentColor" />
    <circle cx="20" cy="16" r="1.1" fill="currentColor" />
    <path d="M15 19q1 1 2 0" />
  </>,
  mug: <>
    <path d="M7 11h14v10a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" fill="var(--color-tint-2)" />
    <path d="M21 13h2a3 3 0 0 1 0 6h-2M11 4q2 2 0 4M16 4q2 2 0 4" />
  </>,
  plant: <>
    <path d="M9 18h14l-2 9H11z" fill="var(--color-tint-3)" />
    <path d="M16 18v-8" />
    <path d="M16 13q-6-1-7-6 6 0 7 6zM16 11q5-1 7-5-6-1-7 5z" fill="white" />
  </>,
  sparkle: <path d="M16 3Q17 15 29 16 17 17 16 29 15 17 3 16 15 15 16 3Z" fill="white" />,
  controller: <>
    <path d="M8 11h16a6 6 0 0 1 6 6v1a4 4 0 0 1-7 3l-2-2H11l-2 2a4 4 0 0 1-7-3v-1a6 6 0 0 1 6-6z" fill="var(--color-tint-3)" />
    <path d="M10 14v5M7.5 16.5h5" />
    <circle cx="21" cy="15" r="1" fill="currentColor" />
    <circle cx="24" cy="18" r="1" fill="currentColor" />
  </>,
  disk: <>
    <path d="M6 5h17l4 4v18H6z" fill="var(--color-tint-2)" />
    <path d="M10 5v7h11V5" />
    <rect x="10" y="17" width="12" height="7" fill="white" />
  </>,
  slime: <>
    <path d="M5 25q0-14 11-15 11 1 11 15z" fill="var(--color-tint-3)" />
    <circle cx="12" cy="19" r="1" fill="currentColor" />
    <circle cx="20" cy="19" r="1" fill="currentColor" />
    <path d="M14.5 22q1.5 1 3 0" />
  </>,
}

export default function Doodle({ motif, className = '' }: { motif: Motif; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`doodle ${motif === 'sparkle' ? 'twinkle' : ''} ${className}`}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {art[motif]}
    </svg>
  )
}
