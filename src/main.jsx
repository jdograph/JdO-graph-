import React from 'https://esm.sh/react@18'
import ReactDOM from 'https://esm.sh/react-dom@18/client'
import App from './App.jsx' // On importe le composant principal
import './index.css' // On importe le CSS global

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
