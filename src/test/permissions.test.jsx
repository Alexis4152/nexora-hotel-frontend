import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Can } from '../guards'

const auth = vi.hoisted(() => ({ permissions: new Set() }))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    can: (c) => auth.permissions.has(c),
    canAny: (...cs) => cs.some((c) => auth.permissions.has(c)),
  }),
}))

describe('<Can>: botones y acciones según permisos', () => {
  it('oculta lo que el rol no permite', () => {
    auth.permissions = new Set(['USERS:VIEW'])
    render(
      <>
        <Can permission="USERS:VIEW"><button>Ver usuarios</button></Can>
        <Can permission="USERS:MANAGE"><button>Nuevo usuario</button></Can>
        <Can any={['ROLES:MANAGE', 'AUDIT:VIEW']}><button>Seguridad</button></Can>
      </>,
    )
    expect(screen.getByText('Ver usuarios')).toBeInTheDocument()
    expect(screen.queryByText('Nuevo usuario')).not.toBeInTheDocument()
    expect(screen.queryByText('Seguridad')).not.toBeInTheDocument()
  })

  it('muestra la acción en cuanto se otorga el permiso', () => {
    auth.permissions = new Set(['AUDIT:VIEW'])
    render(<Can any={['ROLES:MANAGE', 'AUDIT:VIEW']}><button>Seguridad</button></Can>)
    expect(screen.getByText('Seguridad')).toBeInTheDocument()
  })
})
