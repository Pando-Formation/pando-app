'use client'

import { useMemo, useState } from 'react'
import type { NsfTree } from '@/lib/nsf'

type Props = {
  tree: NsfTree
  name: string
  defaultSpecialiteId?: string | null
}

/**
 * Cascading NSF picker: grand domaine → domaine → groupe → champs.
 *
 * 🔴 THE TRAP: champs is a FUNCTION axis, not a topic axis. 315m/315n/315p/315r
 * are the SAME specialite topic (ressources humaines) in the SAME groupe,
 * differing only by champs (conception / mise en œuvre / contrôle…). A flat
 * 380-item dropdown gets mis-picked once and then poisons every BPF filing —
 * so this cascades, and explains the distinction in place.
 */
export function NsfPicker({ tree, name, defaultSpecialiteId }: Props) {
  const defaultSpecialite = defaultSpecialiteId
    ? tree.specialites.find((s) => s.code === defaultSpecialiteId)
    : undefined
  const defaultGroupe = defaultSpecialite
    ? tree.groupes.find((g) => g.code === defaultSpecialite.groupeCode)
    : undefined
  const defaultDomaine = defaultGroupe
    ? tree.domaines.find((d) => d.code === defaultGroupe.domaineCode)
    : undefined

  const [grandDomaineCode, setGrandDomaineCode] = useState(defaultDomaine?.grandDomaineCode ?? '')
  const [domaineCode, setDomaineCode] = useState(defaultDomaine?.code ?? '')
  const [groupeCode, setGroupeCode] = useState(defaultGroupe?.code ?? '')
  const [champsCode, setChampsCode] = useState(defaultSpecialite?.champsCode ?? '')

  const domaines = useMemo(
    () => tree.domaines.filter((d) => d.grandDomaineCode === grandDomaineCode),
    [tree.domaines, grandDomaineCode],
  )
  const groupes = useMemo(
    () => tree.groupes.filter((g) => g.domaineCode === domaineCode),
    [tree.groupes, domaineCode],
  )
  const specialitesForGroupe = useMemo(
    () => tree.specialites.filter((s) => s.groupeCode === groupeCode),
    [tree.specialites, groupeCode],
  )
  const champsOptions = useMemo(() => {
    const codes = new Set(specialitesForGroupe.map((s) => s.champsCode))
    return tree.champs.filter((c) => codes.has(c.code))
  }, [tree.champs, specialitesForGroupe])

  const resolved = specialitesForGroupe.find((s) => s.champsCode === champsCode)

  const grandDomaine = tree.grandDomaines.find((g) => g.code === grandDomaineCode)
  const domaine = tree.domaines.find((d) => d.code === domaineCode)
  const groupe = tree.groupes.find((g) => g.code === groupeCode)
  const champsTitre = tree.champs.find((c) => c.code === champsCode)

  return (
    <div>
      <input type="hidden" name={name} value={resolved?.code ?? ''} />

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div>
          <label className="input-label">Grand domaine</label>
          <select
            className="input"
            value={grandDomaineCode}
            onChange={(e) => {
              setGrandDomaineCode(e.target.value)
              setDomaineCode('')
              setGroupeCode('')
              setChampsCode('')
            }}
          >
            <option value="">— Sélectionner —</option>
            {tree.grandDomaines.map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} — {g.titre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">Domaine</label>
          <select
            className="input"
            value={domaineCode}
            disabled={!grandDomaineCode}
            onChange={(e) => {
              setDomaineCode(e.target.value)
              setGroupeCode('')
              setChampsCode('')
            }}
          >
            <option value="">— Sélectionner —</option>
            {domaines.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} — {d.titre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">Groupe</label>
          <select
            className="input"
            value={groupeCode}
            disabled={!domaineCode}
            onChange={(e) => {
              setGroupeCode(e.target.value)
              setChampsCode('')
            }}
          >
            <option value="">— Sélectionner —</option>
            {groupes.map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} — {g.titre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">Champs</label>
          <select
            className="input"
            value={champsCode}
            disabled={!groupeCode}
            onChange={(e) => setChampsCode(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {champsOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.titre}
              </option>
            ))}
          </select>
          <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
            Le champ précise la <strong>fonction</strong> (conception, mise en œuvre,
            contrôle…), pas le sujet. Exemple&nbsp;: 315m, 315n, 315p et 315r désignent
            la même spécialité (ressources humaines) avec des fonctions différentes.
          </p>
        </div>
      </div>

      {resolved && (
        <p className="t-caption-1" style={{ marginTop: 'var(--space-5)', color: 'var(--color-text-primary)' }}>
          {grandDomaine?.titre} › {domaine?.titre} › {groupe?.titre} › {champsTitre?.titre} ›{' '}
          <strong>
            {resolved.code} — {resolved.titre}
          </strong>
        </p>
      )}
    </div>
  )
}
