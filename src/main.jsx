import React from 'react'
import ReactDOM from 'react-dom/client'
import { loadLanguage } from './i18n'
import './index.css'

// El idioma se carga ANTES de importar la app: menús, etiquetas y constantes se evalúan ya traducidos.
loadLanguage().then(async () => {
  const { default: App } = await import('./App.jsx')
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
