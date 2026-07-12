'use client'

import { useState } from 'react'

type Props = {
  name: string
  defaultValue?: string[]
}

/**
 * Dynamic add/remove list of pedagogic objectives.
 * 🔴 No cap — the old sheet capped at objectif1/2/3, BAM! has five. Never
 * reintroduce a limit here.
 */
export function ObjectivesEditor({ name, defaultValue }: Props) {
  const [objectives, setObjectives] = useState<string[]>(
    defaultValue && defaultValue.length > 0 ? defaultValue : [''],
  )

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(objectives.filter((o) => o.trim() !== ''))} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {objectives.map((objective, i) => (
          <div key={i} style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <input
              className="input"
              type="text"
              value={objective}
              placeholder={`Objectif ${i + 1}`}
              onChange={(e) => {
                const next = [...objectives]
                next[i] = e.target.value
                setObjectives(next)
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={objectives.length === 1}
              onClick={() => setObjectives(objectives.filter((_, j) => j !== i))}
            >
              Retirer
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-sm btn-secondary"
        style={{ marginTop: 'var(--space-4)' }}
        onClick={() => setObjectives([...objectives, ''])}
      >
        + Ajouter un objectif
      </button>
    </div>
  )
}
