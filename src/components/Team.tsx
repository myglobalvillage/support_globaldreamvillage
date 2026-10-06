import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Me } from '../types'

export function Team({ me }: { me: Me }) {
  const [agents, setAgents] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('agent')
  const [msg, setMsg] = useState('')
  const canManage = me.role === 'admin'

  const load = useCallback(() => { api.agents().then(r => setAgents(r.agents || [])).catch(e => setMsg(e.message)) }, [])
  useEffect(load, [load])

  const save = async (em: string, r: string | null) => {
    setMsg('')
    try { await api.setAgentRole(em, r); setEmail(''); load(); setMsg('Saved.') } catch (e: any) { setMsg(e.message) }
  }

  return (
    <main className="team">
      <h2>Support team</h2>
      {msg && <div className="alert info">{msg}</div>}
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th /></tr></thead>
        <tbody>
          {agents.map(a => (
            <tr key={a.userId}>
              <td>{a.name}</td><td>{a.email}</td><td>{a.role}</td>
              <td>{canManage && a.role !== 'admin' && <button className="btn danger sm" onClick={() => save(a.email, null)}>Remove</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {canManage ? (
        <div className="card add-agent">
          <h3>Add team member</h3>
          <p className="muted small">The person must already have a Global Dream Village account.</p>
          <div className="row-gap">
            <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="agent">Agent</option>
              <option value="support_admin">Support admin (can approve refunds)</option>
            </select>
            <button className="btn primary" disabled={!email} onClick={() => save(email, role)}>Add</button>
          </div>
        </div>
      ) : <p className="muted small">Only a platform admin can add or remove team members.</p>}
    </main>
  )
}
