import { useState } from 'react'
import { DEFAULT_MACROS, saveMacros, type Macro } from '../lib/macros'

export function MacroManager({ macros, onChange, onClose }: { macros: Macro[]; onChange: (m: Macro[]) => void; onClose: () => void }) {
  const [list, setList] = useState<Macro[]>(macros)

  const update = (id: string, patch: Partial<Macro>) => setList(l => l.map(m => (m.id === id ? { ...m, ...patch } : m)))
  const add = () => setList(l => [...l, { id: `m-${Date.now()}`, title: 'New macro', body: 'Hi {{customer}}, ' }])
  const remove = (id: string) => setList(l => l.filter(m => m.id !== id))
  const save = () => { const clean = list.filter(m => m.title.trim() && m.body.trim()); saveMacros(clean); onChange(clean); onClose() }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Canned replies</h2>
        <p className="muted small">Variables: <code>{'{{customer}}'}</code> <code>{'{{agent}}'}</code> <code>{'{{ticket}}'}</code>. Saved in this browser.</p>
        {list.map(m => (
          <div key={m.id} className="card macro-edit">
            <input value={m.title} onChange={e => update(m.id, { title: e.target.value })} aria-label="Macro title" />
            <textarea rows={3} value={m.body} onChange={e => update(m.id, { body: e.target.value })} aria-label="Macro body" />
            <button className="btn danger sm" onClick={() => remove(m.id)}>Delete</button>
          </div>
        ))}
        <div className="row-gap end">
          <button className="btn" onClick={() => setList(DEFAULT_MACROS)}>Reset to defaults</button>
          <button className="btn" onClick={add}>+ Add macro</button>
          <button className="btn ghost dark" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}
