function App() {
  const [activeSection, setActiveSection] = useState('home')
  const [isInBoat, setIsInBoat] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState('dawn')
  
  // Cycle jour/nuit (24h = 120 secondes en accéléré)
  useEffect(() => {
    const timeCycle = ['dawn', 'day', 'dusk', 'night']
    let currentIndex = 0
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % timeCycle.length
      setTimeOfDay(timeCycle[currentIndex])
      
      // Mettre à jour l'indicateur
      const timeText = document.getElementById('timeText')
      const timeIcon = document.querySelector('.time-icon')
      if (timeText && timeIcon) {
        switch (timeCycle[currentIndex]) {
          case 'dawn':
            timeText.textContent = 'Aube'
            timeIcon.textContent = '🌅'
            break
          case 'day':
            timeText.textContent = 'Jour'
            timeIcon.textContent = '☀️'
            break
          case 'dusk':
            timeText.textContent = 'Crépuscule'
            timeIcon.textContent = '🌇'
            break
          case 'night':
            timeText.textContent = 'Nuit'
            timeIcon.textContent = '🌙'
            break
        }
      }
    }, 30000) // 30 secondes par période
    
    return () => clearInterval(interval)
  }, [])
  
  // Simulation du chargement
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
          loader.classList.add('hidden')
          setLoaded(true)
        }, 500)
      }
      progressBar.style.width = `${progress}%`
    }, 200 + Math.random() * 300)
    
    return () => clearInterval(interval)
  }, [])
  
  // Gestion du clavier pour monter dans la pirogue
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e' && !isInBoat) {
        setIsInBoat(true)
        document.getElementById('boatHint').classList.add('visible')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInBoat])
  
  if (!loaded) return null
  
  return (
    <div className="app-container">
      <Canvas 
        camera={{ position: [0, 20, 40], fov: 60, near: 0.1, far: 10000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'transparent' }}
      >
        <Scene3D 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
          timeOfDay={timeOfDay}
          isInBoat={isInBoat}
          setIsInBoat={setIsInBoat}
        />
      </Canvas>
      
      {/* Overlay UI */}
      <div className="overlay-ui">
        {/* Barre de navigation */}
        <nav className="navbar-3d">
          <div className="navbar-content">
            <div className="logo-3d">
              <span className="logo-jdo">JDO</span>
              <span className="logo-graph">Graph</span>
            </div>
            <ul className="nav-links-3d">
              {['home', 'about', 'portfolio', 'contact'].map((section) => (
                <li key={section}>
                  <button 
                    className={`nav-btn-3d ${activeSection === section ? 'active' : ''}`}
                    onClick={() => setActiveSection(section)}
                  >
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
        
        {/* Contenu des sections */}
        <div className="section-content">
          {activeSection === 'home' && !isInBoat && (
            <div className="section-panel home-panel">
              <h1 className="panel-title">Bienvenue dans <span className="highlight">l'archipel créatif</span></h1>
              <p className="panel-text">
                Embarquez pour un voyage à travers mes réalisations. 
                Explorez librement les îles avec la souris, ou montez dans la pirogue 
                pour naviguer entre les sections.
              </p>
              <p className="panel-text">
                <strong>Cycle jour/nuit</strong> : Observez comment l'environnement change au fil du temps.
                <br />
                <strong>Faune marine</strong> : Rencontrez baleines, dauphins et tortues dans ces eaux tropicales.
              </p>
              <div className="panel-actions">
                <button className="btn-3d" onClick={() => setActiveSection('about')}>
                  Découvrir mon histoire
                </button>
                <button className="btn-3d btn-secondary" onClick={() => {
                  setIsInBoat(true)
                  document.getElementById('boatHint').classList.add('visible')
                }}>
                  Monter dans la pirogue
                </button>
              </div>
            </div>
          )}
          
          {activeSection === 'about' && !isInBoat && (
            <div className="section-panel about-panel">
              <h1 className="panel-title">À propos de <span className="highlight">JDO Graph</span></h1>
              <div className="about-grid">
                <div className="about-text">
                  <p>Je suis Julien, designer graphique passionné par la création d'expériences visuelles <strong>immersives</strong> et <strong>mémorables</strong>.</p>
                  <p>Mon approche combine <strong>créativité</strong>, <strong>technique</strong> et <strong>narration</strong> pour donner vie à des projets uniques qui captivent l'attention et racontent une histoire.</p>
                  <p>Spécialisé dans le design digital, le branding et l'illustration, je transforme les idées en réalités graphiques percutantes, avec une touche d'authenticité polynésienne.</p>
                </div>
                <div className="about-skills">
                  <h3>Mes compétences</h3>
                  <ul className="skills-list">
                    {['Design Graphique', 'Branding & Identité', 'UI/UX Design', 'Illustration', 'Motion Design', '3D & Animation', 'Web Design', 'Print Design'].map((skill, i) => (
                      <li key={i} className="skill-item-3d">
                        <span className="skill-icon">🌺</span>
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="panel-actions">
                <button className="btn-3d" onClick={() => setActiveSection('portfolio')}>
                  Voir mon travail
                </button>
                <button className="btn-3d btn-secondary" onClick={() => {
                  setIsInBoat(true)
                  document.getElementById('boatHint').classList.add('visible')
                }}>
                  Explorer en pirogue
                </button>
              </div>
            </div>
          )}
          
          {activeSection === 'portfolio' && !isInBoat && (
            <div className="section-panel portfolio-panel">
              <h1 className="panel-title">Mon <span className="highlight">Portfolio</span></h1>
              <p className="panel-text">
                Découvrez une sélection de mes réalisations les plus marquantes, 
                chacune conçue avec soin pour répondre à des besoins spécifiques.
              </p>
              <div className="portfolio-grid-3d">
                {[
                  { title: 'Identité Visuelle - Marque Tahiti', category: 'Branding', desc: 'Création complète d\'une identité visuelle inspirée de la Polynésie' },
                  { title: 'Site Web - Voyage en Océanie', category: 'Web Design', desc: 'Design UI/UX pour une agence de voyage spécialisée' },
                  { title: 'Packaging - Produits Locaux', category: 'Print Design', desc: 'Conception de packaging pour des produits artisanaux' },
                  { title: 'Illustration - Légendes Polynésiennes', category: 'Illustration', desc: 'Série d\'illustrations pour un livre sur les mythes locaux' },
                  { title: 'Animation - Logo Animé', category: 'Motion Design', desc: 'Création d\'un logo animé pour une marque de surf' },
                  { title: 'Application Mobile - Guide Touristique', category: 'UI/UX Design', desc: 'Design d\'une application pour découvrir Tahiti' }
                ].map((project, i) => (
                  <div key={i} className="portfolio-item-3d">
                    <div className="item-image">
                      <div className="placeholder-image" style={{
                        background: `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}, #${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')})`
                      }}></div>
                      <div className="item-overlay">
                        <h3>{project.title}</h3>
                        <p className="item-category">{project.category}</p>
                        <p>{project.desc}</p>
                      </div>
                    </div>
                    <h4>{project.title}</h4>
                  </div>
                ))}
              </div>
              <div className="panel-actions">
                <button className="btn-3d" onClick={() => setActiveSection('contact')}>
                  Travailler avec moi
                </button>
                <button className="btn-3d btn-secondary" onClick={() => {
                  setIsInBoat(true)
                  document.getElementById('boatHint').classList.add('visible')
                }}>
                  Explorer en pirogue
                </button>
              </div>
            </div>
          )}
          
          {activeSection === 'contact' && !isInBoat && (
            <div className="section-panel contact-panel">
              <h1 className="panel-title">Prêt à <span className="highlight">collaborer</span> ?</h1>
              <p className="panel-text">
                Vous avez un projet en tête ? Une idée à concrétiser ? 
                Contactez-moi pour en discuter et donner vie à votre vision.
              </p>
              <form className="contact-form-3d">
                <div className="form-group-3d">
                  <label>Nom *</label>
                  <input type="text" placeholder="Votre nom" required />
                </div>
                <div className="form-group-3d">
                  <label>Email *</label>
                  <input type="email" placeholder="votre@email.com" required />
                </div>
                <div className="form-group-3d">
                  <label>Message *</label>
                  <textarea rows="4" placeholder="Décrivez votre projet..." required></textarea>
                </div>
                <button type="submit" className="btn-3d btn-full">
                  Envoyer le message
                </button>
              </form>
              <div className="contact-info-3d">
                <div className="contact-item-3d">
                  <span className="contact-icon-3d">📧</span>
                  <a href="mailto:contact@jdograph.fr">contact@jdograph.fr</a>
                </div>
                <div className="contact-item-3d">
                  <span className="contact-icon-3d">🌍</span>
                  <span>Polynésie Française / Télétravail</span>
                </div>
                <div className="social-links-3d">
                  <a href="#" className="social-link-3d">LinkedIn</a>
                  <a href="#" className="social-link-3d">Behance</a>
                  <a href="#" className="social-link-3d">Instagram</a>
                  <a href="#" className="social-link-3d">Dribbble</a>
                </div>
              </div>
            </div>
          )}
          
          {/* Message quand on est dans la pirogue */}
          {isInBoat && (
            <div className="section-panel boat-panel">
              <h1 className="panel-title">Navigation en <span className="highlight">Pirogue Tahitienne</span></h1>
              <p className="panel-text">
                Vous êtes maintenant aux commandes ! Utilisez les touches <kbd>ZQSD</kbd> ou <kbd>↑↓←→</kbd> pour naviguer.
              </p>
              <p className="panel-text">
                Approchez-vous des îles pour découvrir chaque section de mon portfolio.
              </p>
              <div className="panel-actions">
                <button className="btn-3d btn-secondary" onClick={() => {
                  setIsInBoat(false)
                  document.getElementById('boatHint').classList.remove('visible')
                }}>
                  Quitter la pirogue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
