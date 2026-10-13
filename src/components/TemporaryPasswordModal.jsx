import { KeyRound, TriangleAlert } from 'lucide-react'
import { CopyField, Modal } from './ui'
import { tx } from '../i18n'

/** Muestra UNA sola vez una contraseña temporal recién generada, con mensaje listo para compartir. */
export default function TemporaryPasswordModal({ data, onClose, title = tx('Contraseña temporal'), loginUrl }) {
  if (!data) return null
  const message = tx('Hola, ya tienes acceso{0}.\nUsuario: {1}\nContraseña temporal: {2}\nAl entrar se te pedirá crear tu propia contraseña.', loginUrl ? ` en ${loginUrl}` : '', data.email, data.temporaryPassword)
  return (
    <Modal open onClose={onClose} title={title} icon={KeyRound}
      description={tx('Compártela por un medio seguro. No se volverá a mostrar.')}
      footer={<button className="btn-primary" onClick={onClose}>{tx('Listo, ya la guardé')}</button>}>
      <div className="space-y-4">
        <CopyField label={tx('Usuario')} value={data.email} />
        <CopyField label={tx('Contraseña temporal')} value={data.temporaryPassword} />
        <CopyField label={tx('Mensaje para enviar')} value={message.replace(/\n/g, ' · ')} mono={false} />
        <div className="flex gap-2.5 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {tx('Al iniciar sesión, el sistema obligará a reemplazarla por una contraseña propia.')}
        </div>
      </div>
    </Modal>
  )
}
