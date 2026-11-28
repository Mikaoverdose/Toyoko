import { useState } from 'react'

const pixels = [
  '  ##    ##  ',
  '  #c#  #c#  ',
  '  #cc##cc#  ',
  ' #cccccccc# ',
  ' #c#cccc#c# ',
  ' #cpc##cpc# ',
  '  #cccccc#  ',
  '   ######   ',
]

export default function Mascot() {
  const [speaking, setSpeaking] = useState(false)

  return (
    <div className={`mascot ${speaking ? 'mascot-paused' : ''}`}>
      {speaking && <p className="mascot-speech" id="mascot-speech">Keep an eye on your containers!</p>}
      <button
        type="button"
        aria-label="Toyoko mascot"
        aria-expanded={speaking}
        aria-controls={speaking ? 'mascot-speech' : undefined}
        onClick={() => setSpeaking(!speaking)}
      >
        <svg viewBox="0 0 12 8" aria-hidden="true" shapeRendering="crispEdges">
          {pixels.map((row, y) => Array.from(row, (color, x) => color === ' ' ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={
              color === '#' ? 'var(--color-doodle)' : color === 'p' ? 'var(--color-mascot-blush)' : 'var(--color-tint-2)'
            } />
          )))}
        </svg>
      </button>
    </div>
  )
}
