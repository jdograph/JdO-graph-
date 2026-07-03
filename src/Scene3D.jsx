import React, { useState, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// --- Océan avec vagues animées ---
function Ocean() {
  const { scene } = useThree()
  const waterRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(2000, 2000, 512, 512)
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
          float depth = 1.0 - vUv.y;
          vec3 baseColor = mix(deepColor, waterColor, depth);
          float light = dot(normalize(lightDirection), normalize(vec3(0.0, 1.0, 0.0)));
          vec3 lightColor = mix(moonColor, sunColor, light * 0.5 + 0.5);
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
  }, [scene])
  
  useFrame(() => {
    if (waterRef.current?.material) {
      waterRef.current.material.uniforms.time.value = clock.current.getElapsedTime()
    }
  })
  
  return null
}

// --- Ciel dynamique ---
function DynamicSky({ timeOfDay }) {
  const { scene } = useThree()
  const skyRef = useRef()
  
  useEffect(() => {
    const geometry = new THREE.SphereGeometry(1000, 64, 64)
    let topColor, middleColor, bottomColor
    
    if (timeOfDay === 'dawn') {
      topColor = '#020617'; middleColor = '#1e3a8a'; bottomColor = '#fbbf24'
    } else if (timeOfDay === 'day') {
      topColor = '#3b82f6'; middleColor = '#60a5fa'; bottomColor = '#93c5fd'
    } else if (timeOfDay === 'dusk') {
      topColor = '#1e1b4b'; middleColor = '#7c3aed'; bottomColor = '#f97316'
    } else {
      topColor = '#020617'; middleColor = '#0f172a'; bottomColor = '#1e293b'
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
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          float h = normalize(vPosition).y;
          vec3 color = mix(bottomColor, middleColor, h * 0.5);
          color = mix(color, topColor, h);
          
          if (starsOpacity > 0.0) {
            vec2 uv = vec2(atan(vPosition.z, vPosition.x) / 3.14159, asin(vPosition.y) / 3.14159);
            uv += 0.5;
            float star = random(floor(uv * 100.0));
            if (star > 0.995) {
              color += vec3(1.0) * 0.8 * starsOpacity;
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
    
    return () => { if (skyRef.current) scene.remove(skyRef.current) }
  }, [timeOfDay, scene])
  
  return null
}

// --- Astres (Soleil / Lune) ---
function CelestialBody({ timeOfDay }) {
  const { scene } = useThree()
  const celestialRef = useRef()
  
  useEffect(() => {
    if (celestialRef.current) {
      scene.remove(celestialRef.current.group)
      scene.remove(celestialRef.current.light)
    }
    
    const group = new THREE.Group()
    let light
    
    if (timeOfDay === 'day' || timeOfDay === 'dawn' || timeOfDay === 'dusk') {
      const geometry = new THREE.SphereGeometry(30, 32, 32)
      const material = new THREE.MeshBasicMaterial({ color: '#fbbf24' })
      const sun = new THREE.Mesh(geometry, material)
      group.add(sun)
      
      light = new THREE.DirectionalLight('#fbbf24', 2)
      light.castShadow = true
      
      scene.add(group)
      scene.add(light)
      
      if (timeOfDay === 'dawn') {
        group.position.set(100, 30, -150); light.position.set(100, 30, -150)
      } else if (timeOfDay === 'dusk') {
        group.position.set(-100, 30, -150); light.position.set(-100, 30, -150)
      } else {
        group.position.set(0, 100, -100); light.position.set(0, 100, -100)
      }
    } else {
      const geometry = new THREE.SphereGeometry(20, 32, 32)
      const material = new THREE.MeshStandardMaterial({
        color: '#a7f3d0', emissive: '#6ee7b7', emissiveIntensity: 0.5
      })
      const moon = new THREE.Mesh(geometry, material)
      group.add(moon)
      
      light = new THREE.PointLight('#a7f3d0', 0.8, 500)
      scene.add(group)
      scene.add(light)
      group.position.set(0, 100, 100)
      light.position.set(0, 100, 100)
    }
    
    celestialRef.current = { group, light }
    
    return () => {
      if (celestialRef.current) {
        scene.remove(celestialRef.current.group)
        scene.remove(celestialRef.current.light)
      }
    }
  }, [timeOfDay, scene])
  
  return null
}

// --- Pirogue ---
const Pirogue = React.forwardRef(({ position, rotation, isInBoat, setIsInBoat }, ref) => {
  const { scene, camera } = useThree()
  const localRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  React.useImperativeHandle(ref, () => localRef.current)

  useEffect(() => {
    const group = new THREE.Group()
    const hullGeometry = new THREE.CylinderGeometry(2, 1.5, 8, 32)
    hullGeometry.rotateX(Math.PI / 2)
    const hullMaterial = new THREE.MeshStandardMaterial({ color: '#8b4513', roughness: 0.7 })
    const hull = new THREE.Mesh(hullGeometry, hullMaterial)
    group.add(hull)
    
    const seatGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.8)
    const seatMaterial = new THREE.MeshStandardMaterial({ color: '#a0522d' })
    const seat = new THREE.Mesh(seatGeometry, seatMaterial)
    seat.position.set(0, 1.2, 0)
    group.add(seat)
    
    if (!isInBoat) {
      const paddleGeometry = new THREE.BoxGeometry(0.2, 0.2, 3)
      const paddleMaterial = new THREE.MeshStandardMaterial({ color: '#8b4513' })
      const paddle = new THREE.Mesh(paddleGeometry, paddleMaterial)
      paddle.position.set(2, 0.5, 0)
      paddle.rotation.z = Math.PI / 4
      group.add(paddle)
    }
    
    const mastGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8)
    const mastMaterial = new THREE.MeshStandardMaterial({ color: '#8b4513' })
    const mast = new THREE.Mesh(mastGeometry, mastMaterial)
    mast.position.set(0, 1.5, -1)
    group.add(mast)
    
    const sailGeometry = new THREE.PlaneGeometry(3, 2)
    const sailMaterial = new THREE.MeshStandardMaterial({ color: '#f5f5dc', side: THREE.DoubleSide })
    const sail = new THREE.Mesh(sailGeometry, sailMaterial)
    sail.position.set(0, 3, -1)
    sail.rotation.y = Math.PI / 2
    group.add(sail)
    
    group.position.set(...position)
    group.rotation.y = rotation
    
    scene.add(group)
    localRef.current = group
    
    return () => scene.remove(group)
  }, [position, rotation, isInBoat, scene])
  
  useFrame(() => {
    if (localRef.current && !isInBoat) {
      const elapsedTime = clock.current.getElapsedTime()
      localRef.current.position.y = -1.5 + Math.sin(elapsedTime * 0.5) * 0.1
      localRef.current.rotation.x = Math.sin(elapsedTime * 0.3) * 0.02
      localRef.current.rotation.z = Math.sin(elapsedTime * 0.4) * 0.02
    }
  })
  
  useEffect(() => {
    if (!localRef.current) return
    const handleClick = (event) => {
      if (!isInBoat) {
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObject(localRef.current, true)
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
})
Pirogue.displayName = 'Pirogue'

// --- Baleine ---
function Whale({ position, timeOfDay }) {
  const { scene } = useThree()
  const whaleRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  useEffect(() => {
    const group = new THREE.Group()
    const bodyGeometry = new THREE.CylinderGeometry(3, 1, 15, 32)
    bodyGeometry.rotateX(Math.PI / 2)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: timeOfDay === 'night' ? '#6b7280' : '#4b5563' })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    group.add(body)
    
    const headGeometry = new THREE.ConeGeometry(2, 6, 32)
    headGeometry.rotateX(Math.PI / 2)
    const headMaterial = new THREE.MeshStandardMaterial({ color: timeOfDay === 'night' ? '#808080' : '#6b7280' })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.set(8, 0, 0)
    group.add(head)
    
    group.position.set(...position)
    scene.add(group)
    whaleRef.current = group
    
    return () => scene.remove(group)
  }, [position, timeOfDay, scene])
  
  useFrame(() => {
    if (whaleRef.current) {
      const elapsedTime = clock.current.getElapsedTime()
      whaleRef.current.position.y = -1 + Math.sin(elapsedTime * 0.3) * 0.5
    }
  })
  
  return null
}

// --- Île Tropicale ---
function TropicalIsland({ position, scale = 1, rotation = 0, name, section, timeOfDay }) {
  const { scene } = useThree()
  
  useEffect(() => {
    const group = new THREE.Group()
    const baseGeometry = new THREE.ConeGeometry(15 * scale, 2 * scale, 32)
    const baseMaterial = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.8 })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.rotation.x = Math.PI / 2
    group.add(base)
    
    group.position.set(...position)
    group.rotation.y = rotation
    scene.add(group)
    return () => scene.remove(group)
  }, [position, scale, rotation, scene])
  
  return null
}

// --- Étoiles ---
function Stars() {
  const { scene } = useThree()
  useEffect(() => {
    const starsGeometry = new THREE.BufferGeometry()
    const starsMaterial = new THREE.PointsMaterial({ color: '#a7f3d0', size: 0.1, transparent: true, opacity: 0.8 })
    const starsVertices = []
    for (let i = 0; i < 2000; i++) {
      starsVertices.push((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000)
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3))
    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)
    return () => scene.remove(stars)
  }, [scene])
  return null
}

// --- COMPOSANT EXPORTÉ PRINCIPAL DE LA SCÈNE ---
export default function Scene3D({ activeSection, timeOfDay, isInBoat, setIsInBoat }) {
  const { camera } = useThree()
  const controlsRef = useRef()
  const boatRef = useRef()
  const clock = useRef(new THREE.Clock())
  
  const cameraPositions = {
    home: { position: [0, 20, 40] },
    about: { position: [-60, 30, 20] },
    portfolio: { position: [0, 40, -80] },
    contact: { position: [50, 25, -20] }
  }
  
  const islands = [
    { position: [0, 0, 0], scale: 1.2, rotation: 0, name: 'Accueil', section: 'home' },
    { position: [-40, 0, -20], scale: 1, rotation: Math.PI / 4, name: 'À Propos', section: 'about' },
    { position: [0, 0, -100], scale: 1.5, rotation: Math.PI / 2, name: 'Portfolio', section: 'portfolio' },
    { position: [40, 0, -60], scale: 1, rotation: -Math.PI / 4, name: 'Contact', section: 'contact' }
  ]
  
  const [boatPosition, setBoatPosition] = useState([0, -1, 10])
  const [boatRotation, setBoatRotation] = useState(0)
  const [whalePosition, setWhalePosition] = useState([-100, -2, -50])
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isInBoat) return
      const moveSpeed = 0.5, rotSpeed = 0.05
      switch (e.key.toLowerCase()) {
        case 'z': case 'arrowup':
          setBoatPosition(prev => [prev[0] + Math.sin(boatRotation) * moveSpeed, prev[1], prev[2] + Math.cos(boatRotation) * moveSpeed])
          break
        case 's': case 'arrowdown':
          setBoatPosition(prev => [prev[0] - Math.sin(boatRotation) * moveSpeed, prev[1], prev[2] - Math.cos(boatRotation) * moveSpeed])
          break
        case 'q': case 'arrowleft': setBoatRotation(prev => prev + rotSpeed); break
        case 'd': case 'arrowright': setBoatRotation(prev => prev - rotSpeed); break
        case 'escape': setIsInBoat(false); document.getElementById('boatHint').classList.remove('visible'); break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInBoat, boatRotation, setIsInBoat])
  
  useFrame(() => {
    const elapsedTime = clock.current.getElapsedTime()
    setWhalePosition(prev => [prev[0] + Math.sin(elapsedTime * 0.05) * 0.1, prev[1], prev[2] + Math.cos(elapsedTime * 0.05) * 0.1])
    
    if (isInBoat) {
      const cameraOffset = new THREE.Vector3(Math.sin(boatRotation) * -10, 3, Math.cos(boatRotation) * -10)
      camera.position.lerp(new THREE.Vector3(boatPosition[0] + cameraOffset.x, boatPosition[1] + cameraOffset.y, boatPosition[2] + cameraOffset.z), 0.1)
      camera.lookAt(boatPosition[0] + Math.sin(boatRotation) * 20, boatPosition[1], boatPosition[2] + Math.cos(boatRotation) * 20)
    } else {
      if (controlsRef.current && cameraPositions[activeSection]) {
        const { position } = cameraPositions[activeSection]
        camera.position.lerp(new THREE.Vector3(...position), 0.05)
      }
    }
  })
  
  return (
    <>
      <ambientLight intensity={timeOfDay === 'night' ? 0.3 : 0.5} color={timeOfDay === 'night' ? '#6ee7b7' : '#a7f3d0'} />
      <DynamicSky timeOfDay={timeOfDay} />
      <Ocean />
      <CelestialBody timeOfDay={timeOfDay} />
      <Stars />
      {islands.map((island, index) => (
        <TropicalIsland key={index} position={island.position} scale={island.scale} rotation={island.rotation} name={island.name} section={island.section} timeOfDay={timeOfDay} />
      ))}
      <Pirogue position={boatPosition} rotation={boatRotation} isInBoat={isInBoat} setIsInBoat={setIsInBoat} ref={boatRef} />
      <Whale position={whalePosition} timeOfDay={timeOfDay} />
      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} minDistance={10} maxDistance={500} maxPolarAngle={Math.PI / 2 - 0.1} enabled={!isInBoat} />
    </>
  )
}
