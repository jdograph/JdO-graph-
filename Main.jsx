// --- FICHIER 2 : src/main.jsx (Configuration React + Three.js) ---
import React, { useState, useEffect, useRef, useCallback } from 'https://esm.sh/react@18'
import ReactDOM from 'https://esm.sh/react-dom@18/client'
import { Canvas, useFrame, useThree, extend } from 'https://esm.sh/@react-three/fiber@8'
import { OrbitControls, Environment, useGLTF, useTexture, Html, PerspectiveCamera } from 'https://esm.sh/@react-three/drei@9'
import * as THREE from 'https://esm.sh/three@0.152'

// ============================================
// COMPOSANTS 3D
// ============================================

// --- Océan avec vagues animées ---
function Ocean() {
  const { scene } = useThree()
  const waterRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  useEffect(() => {
    // Créer un plan d'eau avec shader personnalisé pour les vagues
    const geometry = new THREE.PlaneGeometry(2000, 2000, 512, 512)
    
    // Matériau personnalisé pour les vagues
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waterColor: { value: new THREE.Color('#10b981') },
        deepColor: { value: new THREE.Color('#064e3b') },
        waveHeight: { value: 0.5 },
        waveSpeed: { value: 0.03 },
        waveScale: { value: 0.1 },
        lightDirection: { value: new THREE.Vector3(0, 1, 0) },
        sunColor: { value: new THREE.Color('#fbbf24') },
        moonColor: { value: new THREE.Color('#6ee7b7') }
      },
      vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveSpeed;
        uniform float waveScale;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Animation des vagues
          float wave1 = sin(position.x * waveScale + time * waveSpeed) * waveHeight;
          float wave2 = cos(position.z * waveScale + time * waveSpeed * 1.2) * waveHeight * 0.7;
          float wave3 = sin(position.x * waveScale * 0.8 + position.z * waveScale * 0.8 + time * waveSpeed * 0.8) * waveHeight * 0.5;
          
          vec3 newPosition = position;
          newPosition.y += wave1 + wave2 + wave3;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 waterColor;
        uniform vec3 deepColor;
        uniform vec3 sunColor;
        uniform vec3 moonColor;
        uniform vec3 lightDirection;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Mélange des couleurs en fonction de la profondeur
          float depth = 1.0 - vUv.y;
          vec3 baseColor = mix(deepColor, waterColor, depth);
          
          // Effet de lumière (reflet du soleil/lune)
          float light = dot(normalize(lightDirection), normalize(vec3(0.0, 1.0, 0.0)));
          vec3 lightColor = mix(moonColor, sunColor, light * 0.5 + 0.5);
          
          // Ajout de transparence et brillance
          vec3 finalColor = baseColor + lightColor * 0.3 * (1.0 - depth);
          
          gl_FragColor = vec4(finalColor, 0.8 + depth * 0.2);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    })
    
    const water = new THREE.Mesh(geometry, material)
    water.rotation.x = -Math.PI / 2
    water.position.y = -2
    scene.add(water)
    
    waterRef.current = { water, material }
    
    return () => scene.remove(water)
  }, [])
  
  useFrame(() => {
    if (waterRef.current?.material) {
      waterRef.current.material.uniforms.time.value = clock.current.getElapsedTime()
    }
  })
  
  return null
}

// --- Ciel dynamique (jour/nuit) ---
function DynamicSky({ timeOfDay }) {
  const { scene } = useThree()
  const skyRef = useRef()
  
  useEffect(() => {
    // Supprimer l'ancien ciel
    if (skyRef.current) {
      scene.remove(skyRef.current)
    }
    
    // Créer un dôme pour le ciel
    const geometry = new THREE.SphereGeometry(1000, 64, 64)
    
    // Couleurs basées sur l'heure de la journée
    let topColor, middleColor, bottomColor
    
    if (timeOfDay === 'dawn') {
      topColor = '#020617'
      middleColor = '#1e3a8a'
      bottomColor = '#fbbf24'
    } else if (timeOfDay === 'day') {
      topColor = '#3b82f6'
      middleColor = '#60a5fa'
      bottomColor = '#93c5fd'
    } else if (timeOfDay === 'dusk') {
      topColor = '#1e1b4b'
      middleColor = '#7c3aed'
      bottomColor = '#f97316'
    } else { // night
      topColor = '#020617'
      middleColor = '#0f172a'
      bottomColor = '#1e293b'
    }
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(topColor) },
        middleColor: { value: new THREE.Color(middleColor) },
        bottomColor: { value: new THREE.Color(bottomColor) },
        starsOpacity: { value: timeOfDay === 'night' ? 1.0 : 0.0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 middleColor;
        uniform vec3 bottomColor;
        uniform float starsOpacity;
        varying vec3 vPosition;
        
        // Fonction pour générer des étoiles
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          // Dégradé vertical
          float h = normalize(vPosition).y;
          vec3 color = mix(bottomColor, middleColor, h * 0.5);
          color = mix(color, topColor, h);
          
          // Ajouter des étoiles (seulement la nuit)
          if (starsOpacity > 0.0) {
            vec2 uv = vec2(atan(vPosition.z, vPosition.x) / 3.14159, asin(vPosition.y) / 3.14159);
            uv += 0.5;
            
            float star = random(floor(uv * 100.0));
            if (star > 0.995) {
              float twinkle = sin(time * 10.0 + uv.x * 100.0) * 0.5 + 0.5;
              color += vec3(1.0) * twinkle * 0.8 * starsOpacity;
            }
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide
    })
    
    const sky = new THREE.Mesh(geometry, material)
    sky.position.y = 100
    scene.add(sky)
    skyRef.current = sky
    
    return () => {
      if (skyRef.current) scene.remove(skyRef.current)
    }
  }, [timeOfDay])
  
  return null
}

// --- Soleil/Lune dynamique ---
function CelestialBody({ timeOfDay }) {
  const { scene } = useThree()
  const celestialRef = useRef()
  
  useEffect(() => {
    if (celestialRef.current) {
      scene.remove(celestialRef.current.group)
      scene.remove(celestialRef.current.light)
    }
    
    const group = new THREE.Group()
    
    if (timeOfDay === 'day' || timeOfDay === 'dawn' || timeOfDay === 'dusk') {
      // Soleil
      const geometry = new THREE.SphereGeometry(30, 32, 32)
      const material = new THREE.MeshBasicMaterial({
        color: '#fbbf24'
      })
      const sun = new THREE.Mesh(geometry, material)
      group.add(sun)
      
      // Lumière du soleil
      const light = new THREE.DirectionalLight('#fbbf24', 2)
      light.position.set(100, 100, -100)
      light.castShadow = true
      light.shadow.mapSize.width = 2048
      light.shadow.mapSize.height = 2048
      light.shadow.camera.near = 0.5
      light.shadow.camera.far = 500
      light.shadow.camera.left = -200
      light.shadow.camera.right = 200
      light.shadow.camera.top = 200
      light.shadow.camera.bottom = -200
      
      celestialRef.current = { group, light }
      scene.add(group)
      scene.add(light)
      
      // Positionner le soleil
      if (timeOfDay === 'dawn') {
        group.position.set(100, 30, -150)
        light.position.set(100, 30, -150)
      } else if (timeOfDay === 'dusk') {
        group.position.set(-100, 30, -150)
        light.position.set(-100, 30, -150)
      } else {
        group.position.set(0, 100, -100)
        light.position.set(0, 100, -100)
      }
    } else {
      // Lune
      const geometry = new THREE.SphereGeometry(20, 32, 32)
      const material = new THREE.MeshStandardMaterial({
        color: '#a7f3d0',
        emissive: '#6ee7b7',
        emissiveIntensity: 0.5
      })
      const moon = new THREE.Mesh(geometry, material)
      group.add(moon)
      
      // Lumière de la lune
      const light = new THREE.PointLight('#a7f3d0', 0.8, 500)
      light.position.set(0, 100, 100)
      
      celestialRef.current = { group, light }
      scene.add(group)
      scene.add(light)
      group.position.set(0, 100, 100)
    }
    
    return () => {
      if (celestialRef.current) {
        scene.remove(celestialRef.current.group)
        scene.remove(celestialRef.current.light)
      }
    }
  }, [timeOfDay])
  
  return null
}

// --- Pirogue Tahitienne ---
function Pirogue({ position, rotation, isInBoat, setIsInBoat }) {
  const { scene, camera } = useThree()
  const pirogueRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  useEffect(() => {
    const group = new THREE.Group()
    
    // Corps de la pirogue (forme de canoë)
    const hullGeometry = new THREE.CylinderGeometry(2, 1.5, 8, 32)
    hullGeometry.rotateX(Math.PI / 2)
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: '#8b4513',
      roughness: 0.7
    })
    const hull = new THREE.Mesh(hullGeometry, hullMaterial)
    group.add(hull)
    
    // Siège
    const seatGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.8)
    const seatMaterial = new THREE.MeshStandardMaterial({
      color: '#a0522d'
    })
    const seat = new THREE.Mesh(seatGeometry, seatMaterial)
    seat.position.set(0, 1.2, 0)
    group.add(seat)
    
    // Pagaie (si pas dans la pirogue)
    if (!isInBoat) {
      const paddleGeometry = new THREE.BoxGeometry(0.2, 0.2, 3)
      const paddleMaterial = new THREE.MeshStandardMaterial({ color: '#8b4513' })
      const paddle = new THREE.Mesh(paddleGeometry, paddleMaterial)
      paddle.position.set(2, 0.5, 0)
      paddle.rotation.z = Math.PI / 4
      group.add(paddle)
    }
    
    // Mât avec voile (optionnel)
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8)
    const mastMaterial = new THREE.MeshStandardMaterial({ color: '#8b4513' })
    const mast = new THREE.Mesh(mastGeometry, mastMaterial)
    mast.position.set(0, 1.5, -1)
    group.add(mast)
    
    const sailGeometry = new THREE.PlaneGeometry(3, 2)
    const sailMaterial = new THREE.MeshStandardMaterial({
      color: '#f5f5dc',
      side: THREE.DoubleSide
    })
    const sail = new THREE.Mesh(sailGeometry, sailMaterial)
    sail.position.set(0, 3, -1)
    sail.rotation.y = Math.PI / 2
    group.add(sail)
    
    // Position et rotation
    group.position.set(...position)
    group.rotation.y = rotation
    
    // Ajouter un nom à la pirogue
    group.userData = { type: 'pirogue', name: 'Pirogue Tahitienne' }
    
    scene.add(group)
    pirogueRef.current = group
    
    return () => scene.remove(group)
  }, [position, rotation, isInBoat])
  
  // Animation de la pirogue sur l'eau
  useFrame(() => {
    if (pirogueRef.current && !isInBoat) {
      const elapsedTime = clock.current.getElapsedTime()
      pirogueRef.current.position.y = -1.5 + Math.sin(elapsedTime * 0.5) * 0.1
      pirogueRef.current.rotation.x = Math.sin(elapsedTime * 0.3) * 0.02
      pirogueRef.current.rotation.z = Math.sin(elapsedTime * 0.4) * 0.02
    }
  })
  
  // Gestion du clic sur la pirogue
  useEffect(() => {
    if (!pirogueRef.current) return
    
    const handleClick = (event) => {
      if (!isInBoat) {
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
        
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObject(pirogueRef.current)
        
        if (intersects.length > 0) {
          setIsInBoat(true)
          document.getElementById('boatHint').classList.add('visible')
        }
      }
    }
    
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [isInBoat, setIsInBoat, camera])
  
  return null
}

// --- Faune Marine ---

// Baleine
function Whale({ position, timeOfDay }) {
  const { scene } = useThree()
  const whaleRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  useEffect(() => {
    const group = new THREE.Group()
    
    // Corps de la baleine
    const bodyGeometry = new THREE.CylinderGeometry(3, 1, 15, 32)
    bodyGeometry.rotateX(Math.PI / 2)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: timeOfDay === 'night' ? '#6b7280' : '#4b5563'
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    group.add(body)
    
    // Tête
    const headGeometry = new THREE.ConeGeometry(2, 6, 32)
    headGeometry.rotateX(Math.PI / 2)
    const headMaterial = new THREE.MeshStandardMaterial({
      color: timeOfDay === 'night' ? '#808080' : '#6b7280'
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.set(8, 0, 0)
    group.add(head)
    
    // Queue
    const tailGeometry = new THREE.ConeGeometry(1.5, 5, 32)
    tailGeometry.rotateX(Math.PI)
    tailGeometry.rotateZ(Math.PI / 4)
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial)
    tail.position.set(-8, 0, 0)
    group.add(tail)
    
    // Nageoires
    const finGeometry = new THREE.ConeGeometry(1, 3, 16)
    finGeometry.rotateZ(Math.PI / 2)
    const fin = new THREE.Mesh(finGeometry, bodyMaterial)
    fin.position.set(0, 0, 1.5)
    group.add(fin)
    
    // Souffle (effet visuel)
    const breathGeometry = new THREE.SphereGeometry(0.5, 16, 16)
    const breathMaterial = new THREE.MeshStandardMaterial({
      color: '#a7f3d0',
      transparent: true,
      opacity: 0
    })
    const breath = new THREE.Mesh(breathGeometry, breathMaterial)
    breath.position.set(10, 1, 0)
    group.add(breath)
    
    group.position.set(...position)
    group.userData = { type: 'whale', name: 'Baleine' }
    
    scene.add(group)
    whaleRef.current = { group, breath }
    
    return () => scene.remove(group)
  }, [position, timeOfDay])
  
  // Animation de la baleine
  useFrame(() => {
    if (whaleRef.current) {
      const elapsedTime = clock.current.getElapsedTime()
      
      // Nage en avant
      whaleRef.current.group.position.x += Math.sin(elapsedTime * 0.1) * 0.05
      whaleRef.current.group.position.z += Math.cos(elapsedTime * 0.1) * 0.05
      whaleRef.current.group.position.y = -1 + Math.sin(elapsedTime * 0.3) * 0.5
      
      // Mouvement de la queue
      whaleRef.current.group.children[2].rotation.z = Math.sin(elapsedTime * 2) * 0.5
      
      // Souffle périodique
      if (Math.sin(elapsedTime * 0.5) > 0.95) {
        whaleRef.current.breath.material.opacity = 0.8 - Math.sin(elapsedTime * 0.5) * 0.8
        whaleRef.current.breath.position.y = 1 + Math.sin(elapsedTime * 2) * 0.5
      } else {
        whaleRef.current.breath.material.opacity = 0
      }
    }
  })
  
  return null
}

// Dauphin
function Dolphin({ position, timeOfDay }) {
  const { scene } = useThree()
  const dolphinRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  useEffect(() => {
    const group = new THREE.Group()
    
    // Corps
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.5, 4, 32)
    bodyGeometry.rotateX(Math.PI / 2)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: timeOfDay === 'night' ? '#6ee7b7' : '#34d399'
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    group.add(body)
    
    // Bec
    const beakGeometry = new THREE.ConeGeometry(0.4, 1.5, 16)
    beakGeometry.rotateX(Math.PI / 2)
    const beak = new THREE.Mesh(beakGeometry, bodyMaterial)
    beak.position.set(2.5, 0, 0)
    group.add(beak)
    
    // Nageoire dorsale
    const finGeometry = new THREE.ConeGeometry(0.5, 2, 16)
    finGeometry.rotateZ(Math.PI / 2)
    const fin = new THREE.Mesh(finGeometry, bodyMaterial)
    fin.position.set(0, 0, 1)
    group.add(fin)
    
    // Nageoire caudale
    const tailGeometry = new THREE.ConeGeometry(0.6, 2, 16)
    tailGeometry.rotateX(Math.PI)
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial)
    tail.position.set(-2.5, 0, 0)
    group.add(tail)
    
    group.position.set(...position)
    group.userData = { type: 'dolphin', name: 'Dauphin' }
    
    scene.add(group)
    dolphinRef.current = group
    
    return () => scene.remove(group)
  }, [position, timeOfDay])
  
  // Animation du dauphin
  useFrame(() => {
    if (dolphinRef.current) {
      const elapsedTime = clock.current.getElapsedTime()
      
      // Nage rapide et saut
      dolphinRef.current.position.x += Math.sin(elapsedTime * 0.2) * 0.1
      dolphinRef.current.position.z += Math.cos(elapsedTime * 0.2) * 0.1
      dolphinRef.current.position.y = -0.5 + Math.sin(elapsedTime * 3) * 1
      
      // Mouvement de la queue
      dolphinRef.current.children[3].rotation.x = Math.sin(elapsedTime * 5) * 0.8
      
      // Rotation du corps
      dolphinRef.current.rotation.y = Math.sin(elapsedTime * 0.5) * 0.2
      dolphinRef.current.rotation.z = Math.sin(elapsedTime * 0.3) * 0.1
    }
  })
  
  return null
}

// Tortue marine
function Turtle({ position, timeOfDay }) {
  const { scene } = useThree()
  const turtleRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  useEffect(() => {
    const group = new THREE.Group()
    
    // Carapace
    const shellGeometry = new THREE.DodecahedronGeometry(1.5, 0)
    const shellMaterial = new THREE.MeshStandardMaterial({
      color: timeOfDay === 'night' ? '#4b5563' : '#374151'
    })
    const shell = new THREE.Mesh(shellGeometry, shellMaterial)
    group.add(shell)
    
    // Tête
    const headGeometry = new THREE.BoxGeometry(0.8, 0.5, 0.6)
    const headMaterial = new THREE.MeshStandardMaterial({
      color: timeOfDay === 'night' ? '#6b7280' : '#4b5563'
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.set(1.8, 0, 0)
    group.add(head)
    
    // Nageoires
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const finGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.3)
      const fin = new THREE.Mesh(finGeometry, headMaterial)
      fin.position.set(
        Math.cos(angle) * 1.2,
        0,
        Math.sin(angle) * 1.2
      )
      fin.rotation.z = angle
      group.add(fin)
    }
    
    group.position.set(...position)
    group.userData = { type: 'turtle', name: 'Tortue Marine' }
    
    scene.add(group)
    turtleRef.current = group
    
    return () => scene.remove(group)
  }, [position, timeOfDay])
  
  // Animation de la tortue
  useFrame(() => {
    if (turtleRef.current) {
      const elapsedTime = clock.current.getElapsedTime()
      
      // Nage lente
      turtleRef.current.position.x += Math.sin(elapsedTime * 0.05) * 0.02
      turtleRef.current.position.z += Math.cos(elapsedTime * 0.05) * 0.02
      turtleRef.current.position.y = -1.5 + Math.sin(elapsedTime * 0.2) * 0.1
      
      // Mouvement des nageoires
      for (let i = 1; i < 5; i++) {
        turtleRef.current.children[i].rotation.x = Math.sin(elapsedTime * 2 + i * 0.5) * 0.3
      }
      
      // Mouvement de la tête
      turtleRef.current.children[1].rotation.y = Math.sin(elapsedTime * 0.8) * 0.1
    }
  })
  
  return null
}

// --- Îles Tropicales ---
function TropicalIsland({ position, scale = 1, rotation = 0, name, section, timeOfDay }) {
  const { scene } = useThree()
  
  useEffect(() => {
    const group = new THREE.Group()
    
    // Base de l'île (sable)
    const baseGeometry = new THREE.ConeGeometry(15 * scale, 2 * scale, 32)
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      roughness: 0.8
    })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.rotation.x = Math.PI / 2
    group.add(base)
    
    // Végétation - palmiers
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const distance = 8 * scale + Math.random() * 5 * scale
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      
      // Tronc
      const trunkGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.2 * scale, 4 * scale + Math.random() * 2 * scale, 8)
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#8b4513' })
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
      trunk.position.set(x, 2 * scale + Math.random() * 0.5 * scale, z)
      group.add(trunk)
      
      // Feuilles
      const leavesGeometry = new THREE.ConeGeometry(2 * scale, 3 * scale, 16)
      const leavesMaterial = new THREE.MeshStandardMaterial({ 
        color: timeOfDay === 'night' ? '#064e3b' : '#065f46' 
      })
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial)
      leaves.position.set(x, 4 * scale + Math.random() * 1 * scale, z)
      leaves.rotation.x = Math.PI / 4 + (Math.random() - 0.5) * 0.3
      group.add(leaves)
    }
    
    // Rochers
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2
      const distance = 12 * scale + Math.random() * 3 * scale
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      
      const rockGeometry = new THREE.DodecahedronGeometry(1 * scale + Math.random() * 0.5 * scale)
      const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: '#404040',
        roughness: 0.9
      })
      const rock = new THREE.Mesh(rockGeometry, rockMaterial)
      rock.position.set(x, 1 * scale + Math.random() * 0.5 * scale, z)
      group.add(rock)
    }
    
    // Lumière locale
    const light = new THREE.PointLight('#a7f3d0', 0.5, 20 * scale)
    light.position.set(0, 10 * scale, 0)
    group.add(light)
    
    // Ajouter un marqueur pour l'île
    const markerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32)
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: timeOfDay === 'night' ? '#6ee7b7' : '#10b981',
      emissive: timeOfDay === 'night' ? '#6ee7b7' : '#10b981',
      emissiveIntensity: 0.5
    })
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    marker.position.y = 2 * scale
    marker.rotation.x = Math.PI / 2
    group.add(marker)
    
    group.position.set(...position)
    group.rotation.y = rotation
    group.userData = { name, section, type: 'island' }
    scene.add(group)
    
    return () => scene.remove(group)
  }, [position, scale, rotation, name, section, timeOfDay])
  
  return null
}

// --- Étoiles ---
function Stars() {
  const { scene } = useThree()
  
  useEffect(() => {
    const starsGeometry = new THREE.BufferGeometry()
    const starsMaterial = new THREE.PointsMaterial({
      color: '#a7f3d0',
      size: 0.1,
      transparent: true,
      opacity: 0.8
    })
    
    const starsVertices = []
    for (let i = 0; i < 15000; i++) {
      const x = (Math.random() - 0.5) * 4000
      const y = (Math.random() - 0.5) * 4000
      const z = (Math.random() - 0.5) * 4000
      starsVertices.push(x, y, z)
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3))
    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)
    
    return () => scene.remove(stars)
  }, [])
  
  return null
}

// ============================================
// SCÈNE PRINCIPALE
// ============================================

function Scene3D({ activeSection, setActiveSection, timeOfDay, isInBoat, setIsInBoat }) {
  const { camera, gl, scene } = useThree()
  const controlsRef = useRef()
  const boatRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  // Position de la caméra pour chaque section
  const cameraPositions = {
    home: { position: [0, 20, 40], target: [0, 0, 0] },
    about: { position: [-60, 30, 20], target: [-40, 0, 0] },
    portfolio: { position: [0, 40, -80], target: [0, 0, -60] },
    contact: { position: [50, 25, -20], target: [40, 0, -10] }
  }
  
  // Position des îles
  const islands = [
    { position: [0, 0, 0], scale: 1.2, rotation: 0, name: 'Accueil', section: 'home' },
    { position: [-40, 0, -20], scale: 1, rotation: Math.PI / 4, name: 'À Propos', section: 'about' },
    { position: [0, 0, -100], scale: 1.5, rotation: Math.PI / 2, name: 'Portfolio', section: 'portfolio' },
    { position: [40, 0, -60], scale: 1, rotation: -Math.PI / 4, name: 'Contact', section: 'contact' }
  ]
  
  // Position de la pirogue
  const [boatPosition, setBoatPosition] = useState([0, -1, 10])
  const [boatRotation, setBoatRotation] = useState(0)
  
  // Position des animaux
  const [whalePosition, setWhalePosition] = useState([-100, -2, -50])
  const [dolphinPositions, setDolphinPositions] = useState([
    [50, -1, -30],
    [-30, -0.5, 20],
    [20, -1.5, -80]
  ])
  const [turtlePositions, setTurtlePositions] = useState([
    [-20, -2, 10],
    [30, -1.5, -40],
    [-50, -2, -70]
  ])
  
  // Gestion des déplacements de la pirogue
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isInBoat) return
      
      const moveSpeed = 0.5
      const rotSpeed = 0.05
      
      switch (e.key.toLowerCase()) {
        case 'z': case 'arrowup':
          setBoatPosition(prev => [
            prev[0] + Math.sin(boatRotation) * moveSpeed,
            prev[1],
            prev[2] + Math.cos(boatRotation) * moveSpeed
          ])
          break
        case 's': case 'arrowdown':
          setBoatPosition(prev => [
            prev[0] - Math.sin(boatRotation) * moveSpeed,
            prev[1],
            prev[2] - Math.cos(boatRotation) * moveSpeed
          ])
          break
        case 'q': case 'arrowleft':
          setBoatRotation(prev => prev + rotSpeed)
          break
        case 'd': case 'arrowright':
          setBoatRotation(prev => prev - rotSpeed)
          break
        case 'escape':
          setIsInBoat(false)
          document.getElementById('boatHint').classList.remove('visible')
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInBoat, boatRotation, setIsInBoat])
  
  // Animation des animaux
  useFrame(() => {
    const elapsedTime = clock.current.getElapsedTime()
    
    // Animation de la baleine
    setWhalePosition(prev => [
      prev[0] + Math.sin(elapsedTime * 0.05) * 0.1,
      prev[1],
      prev[2] + Math.cos(elapsedTime * 0.05) * 0.1
    ])
    
    // Animation des dauphins
    setDolphinPositions(prev => 
      prev.map((pos, i) => [
        pos[0] + Math.sin(elapsedTime * 0.1 + i) * 0.2,
        pos[1] + Math.sin(elapsedTime * 2 + i) * 0.1,
        pos[2] + Math.cos(elapsedTime * 0.1 + i) * 0.2
      ])
    )
    
    // Animation des tortues
    setTurtlePositions(prev => 
      prev.map((pos, i) => [
        pos[0] + Math.sin(elapsedTime * 0.02 + i) * 0.05,
        pos[1] + Math.sin(elapsedTime * 0.5 + i) * 0.02,
        pos[2] + Math.cos(elapsedTime * 0.02 + i) * 0.05
      ])
    )
    
    // Si on est dans la pirogue, mettre à jour la caméra
    if (isInBoat && boatRef.current) {
      const boat = boatRef.current
      const cameraOffset = new THREE.Vector3(
        Math.sin(boatRotation) * -10,
        3,
        Math.cos(boatRotation) * -10
      )
      camera.position.lerp(new THREE.Vector3(
        boatPosition[0] + cameraOffset.x,
        boatPosition[1] + cameraOffset.y,
        boatPosition[2] + cameraOffset.z
      ), 0.1)
      camera.lookAt(
        boatPosition[0] + Math.sin(boatRotation) * 20,
        boatPosition[1],
        boatPosition[2] + Math.cos(boatRotation) * 20
      )
      controlsRef.current?.enabled = false
    } else {
      // Animation de la caméra pour les sections
      if (controlsRef.current && cameraPositions[activeSection]) {
        const { position, target } = cameraPositions[activeSection]
        controlsRef.current.position0.lerp(new THREE.Vector3(...position), 0.05)
        controlsRef.current.target0.lerp(new THREE.Vector3(...target), 0.05)
        controlsRef.current.update()
        controlsRef.current.enabled = true
      }
    }
    
    // Vérifier les collisions avec les îles
    if (isInBoat) {
      islands.forEach(island => {
        const dx = boatPosition[0] - island.position[0]
        const dz = boatPosition[2] - island.position[2]
        const distance = Math.sqrt(dx * dx + dz * dz)
        
        if (distance < 15) {
          setActiveSection(island.section)
        }
      })
    }
  })
  
  // Gestion du clic sur les îles
  const handleIslandClick = useCallback((section) => {
    if (!isInBoat) {
      setActiveSection(section)
      
      // Positionner la caméra sur l'île
      const island = islands.find(i => i.section === section)
      if (island && controlsRef.current) {
        controlsRef.current.position0.set(
          island.position[0] + 30,
          25,
          island.position[2] + 30
        )
        controlsRef.current.target0.set(
          island.position[0],
          0,
          island.position[2]
        )
        controlsRef.current.update()
      }
    }
  }, [isInBoat, setActiveSection, islands])
  
  return (
    <>
      {/* Environnement */}
      <ambientLight intensity={timeOfDay === 'night' ? 0.3 : 0.5} color={timeOfDay === 'night' ? '#6ee7b7' : '#a7f3d0'} />
      
      {/* Ciel et océan */}
      <DynamicSky timeOfDay={timeOfDay} />
      <Ocean />
      <CelestialBody timeOfDay={timeOfDay} />
      <Stars />
      
      {/* Îles */}
      {islands.map((island, index) => (
        <TropicalIsland 
          key={index} 
          position={island.position}
          scale={island.scale}
          rotation={island.rotation}
          name={island.name}
          section={island.section}
          timeOfDay={timeOfDay}
        />
      ))}
      
      {/* Pirogue */}
      <Pirogue 
        position={boatPosition}
        rotation={boatRotation}
        isInBoat={isInBoat}
        setIsInBoat={setIsInBoat}
        ref={boatRef}
      />
      
      {/* Faune marine */}
      <Whale position={whalePosition} timeOfDay={timeOfDay} />
      {dolphinPositions.map((pos, i) => (
        <Dolphin key={i} position={pos} timeOfDay={timeOfDay} />
      ))}
      {turtlePositions.map((pos, i) => (
        <Turtle key={i} position={pos} timeOfDay={timeOfDay} />
      ))}
      
      {/* Contrôles */}
      <OrbitControls 
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={500}
        maxPolarAngle={Math.PI / 2 - 0.1}
        enabled={!isInBoat}
      />
    </>
  )
}

