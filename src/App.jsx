import React, { useState, useEffect } from 'https://esm.sh/react@18'
import { Canvas } from 'https://esm.sh/@react-three/fiber@8'
import Scene3D from './Scene3D.jsx'

export default function App() {
  const [activeSection, setActiveSection] = useState('home')
  const [isInBoat, setIsInBoat] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState('dawn')
  
  useEffect(() => {
    const timeCycle = ['dawn', 'day', 'dusk', 'night']
    let currentIndex = 0
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % timeCycle.length
      setTimeOfDay(timeCycle[currentIndex])
      
      // Met à jour l'indicateur HTML externe si présent
      const timeText = document.getElementById('timeText')
      if (timeText) {
        const emojies = { dawn: '🌅 Aube', day: '☀️ Jour', dusk: '🌇 Crépuscule', night: '🌙 Nuit' }
        timeText.innerText = emojies[timeCycle[currentIndex]]
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    const loader = document.getElementById('initialLoader')
    const progressBar = document.getElementById('loaderProgress')
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setTimeout(() => {
          if (loader) loader.classList.add('hidden')
          setLoaded(true)
        }, 500)
      }
      if (progressBar) progressBar.style.width = `${progress}%`
    }, 200)
    return () => clearInterval(interval)
  }, [])
  
  if (!loaded) return null
  
  return (
    <div className="app-container">
      <Canvas camera={{ position: [0, 20, 40], fov: 60, near: 0.1, far: 10000 }}>
        <Scene3D activeSection={activeSection} timeOfDay={timeOfDay} isInBoat={isInBoat} setIsInBoat={setIsInBoat} />
      </Canvas>
      
      <div className="overlay-ui">
        <nav className="navbar-3d">
          <div className="navbar-content">
            <div className="logo-3d"><span className="logo-jdo">JDO</span><span className="logo-graph">Graph</span></div>
            <ul className="nav-links-3d">
              {['home', 'about', 'portfolio', 'contact'].map((section) => (
                <li key={section}>
                  <button className={`nav-btn-3d ${activeSection === section ? 'active' : ''}`} onClick={() => setActiveSection(section)}>
                    {section === 'home' && '🏝️ Accueil'}
                    {section === 'about' && '🌴 À Propos'}
                    {section === 'portfolio' && '🎨 Portfolio'}
                    {section === 'contact' && '📩 Contact'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        
        <div className="section-content">
          {activeSection === 'home' && !isInBoat && (
            <div className="section-panel home-panel">
              <h1 className="panel-title">Bienvenue dans <span className="highlight">l'archipel créatif</span></h1>
              <p className="panel-text">Embarquez pour un voyage à travers mes réalisations. Utilisez la pirogue pour naviguer entre les sections.</p>
              <div className="panel-actions">
                <button className="btn-3d" onClick={() => setActiveSection('about')}>Découvrir mon histoire</button>
                <button className="btn-3d btn-secondary" onClick={() => setIsInBoat(true)}>Monter dans la pirogue</button>
              </div>
            </div>
          )}
          {activeSection === 'about' && !isInBoat && (
            <div className="section-panel about-panel">
              <h1 className="panel-title">À Propos de <span className="highlight">Moi</span></h1>
              <p className="panel-text">Créateur d'univers numériques, je fusionne le code et le design pour donner vie à des expériences immersives uniques.</p>
            </div>
          )}
          {activeSection === 'portfolio' && !isInBoat && (
            <div className="section-panel portfolio-panel">
              <h1 className="panel-title">Mon <span className="highlight">Portfolio</span></h1>
              <p className="panel-text">Explorez mes projets récents. Chaque île de cet archipel représente une facette de mes compétences.</p>
            </div>
          )}
          {activeSection === 'contact' && !isInBoat && (
            <div className="section-panel contact-panel">
              <h1 className="panel-title">Prendre <span className="highlight">Contact</span></h1>
              <p className="panel-text">Envie de collaborer ou de discuter d'un projet ? Écrivez-moi et créons quelque chose d'incroyable ensemble.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
