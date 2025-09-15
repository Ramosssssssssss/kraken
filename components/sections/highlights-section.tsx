"use client"

import { useState, useRef, Suspense, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Box, Text, Environment, PerspectiveCamera } from "@react-three/drei"
import {
  Package,
  Truck,
  BarChart3,
  Shield,
  ChevronRight,
  Target,
  Users,
  ChevronLeft,
  ArrowRight,
  MousePointer,
  Move3D,
  Sparkles,
  Cpu,
} from "lucide-react"

function WarehouseShelf({ position, color = "#7c3aed", onClick, isHighlighted = false }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (meshRef.current && isHighlighted) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  return (
    <group position={position} onClick={onClick}>
      <Box ref={meshRef} args={[2, 3, 0.5]} position={[0, 1.5, 0]} onClick={onClick}>
        <meshStandardMaterial
          color={isHighlighted ? "#a855f7" : color}
          transparent
          opacity={isHighlighted ? 0.9 : 0.7}
          emissive={isHighlighted ? "#7c3aed" : "#000000"}
          emissiveIntensity={isHighlighted ? 0.2 : 0}
        />
      </Box>
      {/* Shelf levels */}
      {[0.5, 1.5, 2.5].map((y, i) => (
        <Box key={i} args={[2.2, 0.1, 0.6]} position={[0, y, 0]}>
          <meshStandardMaterial color="#4a5568" />
        </Box>
      ))}
    </group>
  )
}

function LoadingDock({ position, color = "#6b7280" }) {
  return (
    <group position={position}>
      {/* Dock platform */}
      <Box args={[4, 0.3, 2]} position={[0, 0.15, 0]}>
        <meshStandardMaterial color={color} />
      </Box>
      {/* Dock door frame */}
      <Box args={[0.2, 3, 2]} position={[-2, 1.5, 0]}>
        <meshStandardMaterial color="#374151" />
      </Box>
      <Box args={[0.2, 3, 2]} position={[2, 1.5, 0]}>
        <meshStandardMaterial color="#374151" />
      </Box>
      <Box args={[4, 0.2, 2]} position={[0, 3, 0]}>
        <meshStandardMaterial color="#374151" />
      </Box>
      {/* Dock door */}
      <Box args={[3.6, 2.6, 0.1]} position={[0, 1.3, -0.95]}>
        <meshStandardMaterial color="#4b5563" />
      </Box>
    </group>
  )
}

function AdditionalShelving({ position, color = "#6366f1" }) {
  return (
    <group position={position}>
      <Box args={[1.5, 2.5, 0.4]} position={[0, 1.25, 0]}>
        <meshStandardMaterial color={color} transparent opacity={0.6} />
      </Box>
      {/* Shelf levels */}
      {[0.4, 1.2, 2].map((y, i) => (
        <Box key={i} args={[1.7, 0.08, 0.5]} position={[0, y, 0]}>
          <meshStandardMaterial color="#4a5568" />
        </Box>
      ))}
    </group>
  )
}

function WarehouseFloor() {
  return (
    <Box args={[30, 0.1, 20]} position={[0, -0.05, 0]}>
      <meshStandardMaterial color="#2d3748" />
    </Box>
  )
}

function MovingForklift() {
  const meshRef = useRef()

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 8
      meshRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.3) * 6
      meshRef.current.rotation.y = Math.atan2(
        Math.cos(state.clock.elapsedTime * 0.5) * 8,
        -Math.sin(state.clock.elapsedTime * 0.3) * 6,
      )
    }
  })

  return (
    <group ref={meshRef} position={[0, 0.5, 0]}>
      {/* Forklift body */}
      <Box args={[1, 0.8, 2]}>
        <meshStandardMaterial color="#ff6b35" />
      </Box>
      {/* Forklift mast */}
      <Box args={[0.2, 2, 0.2]} position={[0.4, 1, -0.8]}>
        <meshStandardMaterial color="#4a5568" />
      </Box>
    </group>
  )
}

function Interactive3DWarehouse() {
  const [selectedZone, setSelectedZone] = useState(null)

  // Left side areas - PAQUETERIA, EXHIBICIÓN, ISLA MAQUINAS
  const leftAreas = [
    { id: "paqueteria", position: [-14, 0, 8], name: "Paquetería", color: "#ec4899" },
    { id: "exhibicion", position: [-10, 0, 8], name: "Exhibición", color: "#06b6d4" },
    { id: "isla-maquinas", position: [-14, 0, 4], name: "Isla Máquinas", color: "#dc2626" },
  ]

  // Checkout areas - CAJA 1, 2, 3
  const checkoutAreas = [
    { position: [-14, 0, 0], name: "Caja 1", color: "#ec4899" },
    { position: [-14, 0, -2], name: "Caja 2", color: "#ec4899" },
    { position: [-14, 0, -4], name: "Caja 3", color: "#ec4899" },
  ]

  // Góndola areas with LI/LD designations
  const gondolas = [
    { position: [-10, 0, 0], name: "Góndola 1-LI", color: "#eab308" },
    { position: [-10, 0, -1], name: "Góndola 1-LD", color: "#eab308" },
    { position: [-10, 0, -3], name: "Góndola 2-LI", color: "#eab308" },
    { position: [-10, 0, -4], name: "Góndola 2-LD", color: "#eab308" },
  ]

  // PASILLOS 1-6 (Left section with LD/LI designations)
  const leftAisles = [
    { position: [-6, 0, 8], name: "Pasillo 1-LD", color: "#dc2626" },
    { position: [-6, 0, 7], name: "Pasillo 2-LI", color: "#dc2626" },
    { position: [-6, 0, 5], name: "Pasillo 2-LD", color: "#eab308" },
    { position: [-6, 0, 4], name: "Pasillo 3-LI", color: "#22c55e" },
    { position: [-6, 0, 2], name: "Pasillo 3-LD", color: "#06b6d4" },
    { position: [-6, 0, 1], name: "Pasillo 4-LI", color: "#eab308" },
    { position: [-6, 0, -1], name: "Pasillo 4-LD", color: "#22c55e" },
    { position: [-6, 0, -2], name: "Pasillo 5-LI", color: "#dc2626" },
    { position: [-6, 0, -4], name: "Pasillo 5-LD", color: "#22c55e" },
    { position: [-6, 0, -5], name: "Pasillo 6-LI", color: "#dc2626" },
  ]

  // PASILLOS 7-12 (Center section - larger red areas)
  const centerAisles = [
    { position: [-2, 0, 8], name: "Pasillo 7-LD", color: "#dc2626" },
    { position: [-2, 0, 7], name: "Pasillo 8-LI", color: "#dc2626" },
    { position: [-2, 0, 5], name: "Pasillo 8-LD", color: "#dc2626" },
    { position: [-2, 0, 4], name: "Pasillo 9-LI", color: "#dc2626" },
    { position: [-2, 0, 2], name: "Pasillo 9-LD", color: "#dc2626" },
    { position: [-2, 0, 1], name: "Pasillo 10-LI", color: "#dc2626" },
    { position: [-2, 0, -1], name: "Pasillo 10-LD", color: "#dc2626" },
    { position: [-2, 0, -2], name: "Pasillo 11-LI", color: "#dc2626" },
    { position: [-2, 0, -4], name: "Pasillo 11-LD", color: "#dc2626" },
    { position: [-2, 0, -5], name: "Pasillo 12-LI", color: "#dc2626" },
  ]

  // PASILLOS 13-18 (Right section with LD/LI designations)
  const rightAisles = [
    { position: [2, 0, 8], name: "Pasillo 13-LD", color: "#dc2626" },
    { position: [2, 0, 7], name: "Pasillo 14-LI", color: "#22c55e" },
    { position: [2, 0, 5], name: "Pasillo 14-LD", color: "#dc2626" },
    { position: [2, 0, 4], name: "Pasillo 15-LI", color: "#dc2626" },
    { position: [2, 0, 2], name: "Pasillo 15-LD", color: "#22c55e" },
    { position: [2, 0, 1], name: "Pasillo 16-LI", color: "#22c55e" },
    { position: [2, 0, -1], name: "Pasillo 16-LD", color: "#dc2626" },
    { position: [2, 0, -2], name: "Pasillo 17-LI", color: "#22c55e" },
    { position: [2, 0, -4], name: "Pasillo 17-LD", color: "#22c55e" },
    { position: [2, 0, -5], name: "Pasillo 18-LI", color: "#dc2626" },
  ]

  // Right side specialized areas
  const rightAreas = [
    { position: [6, 0, 4], name: "Alto Valor", color: "#dc2626" },
    { position: [6, 0, -2], name: "Mostrador Polvo", color: "#06b6d4" },
    { position: [10, 0, 4], name: "Iluminación", color: "#dc2626" },
  ]

  // Bottom section - TUBOS
  const tubesSection = [
    { position: [-6, 0, -8], name: "Tubos", color: "#22c55e" },
    { position: [-2, 0, -8], name: "Pasillo 6-LD", color: "#22c55e" },
    { position: [2, 0, -8], name: "Pasillo 12-LD", color: "#dc2626" },
    { position: [6, 0, -8], name: "Pasillo 18-LD", color: "#dc2626" },
  ]

  // Loading dock and CEDIS areas
  const loadingAreas = [
    { position: [12, 0, 2], name: "Andén Principal", color: "#374151" },
    { position: [12, 0, -2], name: "Entrada/Salida", color: "#374151" },
    { position: [12, 0, -6], name: "CEDIS", color: "#1f2937" },
  ]

  // Combine all zones for selection
  const allZones = [...leftAreas, ...checkoutAreas, ...gondolas, ...rightAreas]

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden bg-gradient-to-br from-background/50 to-primary/10 border border-primary/20">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[25, 25, 25]} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={20}
          maxDistance={60}
        />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[15, 15, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#7c3aed" />

        <Suspense fallback={null}>
          <Environment preset="warehouse" />

          <Box args={[50, 0.1, 35]} position={[0, -0.05, 0]}>
            <meshStandardMaterial color="#2d3748" />
          </Box>

          {/* Left side areas */}
          {leftAreas.map((zone) => (
            <WarehouseShelf
              key={zone.id}
              position={zone.position}
              color={zone.color}
              isHighlighted={selectedZone === zone.id}
              onClick={() => setSelectedZone(zone.id)}
            />
          ))}

          {/* Checkout areas */}
          {checkoutAreas.map((checkout, index) => (
            <AdditionalShelving key={`checkout-${index}`} position={checkout.position} color={checkout.color} />
          ))}

          {/* Góndola areas */}
          {gondolas.map((gondola, index) => (
            <AdditionalShelving key={`gondola-${index}`} position={gondola.position} color={gondola.color} />
          ))}

          {/* All aisle sections */}
          {leftAisles.map((aisle, index) => (
            <AdditionalShelving key={`left-aisle-${index}`} position={aisle.position} color={aisle.color} />
          ))}

          {centerAisles.map((aisle, index) => (
            <AdditionalShelving key={`center-aisle-${index}`} position={aisle.position} color={aisle.color} />
          ))}

          {rightAisles.map((aisle, index) => (
            <AdditionalShelving key={`right-aisle-${index}`} position={aisle.position} color={aisle.color} />
          ))}

          {/* Right side specialized areas */}
          {rightAreas.map((area, index) => (
            <AdditionalShelving key={`right-area-${index}`} position={area.position} color={area.color} />
          ))}

          {/* Tubes section */}
          {tubesSection.map((tube, index) => (
            <AdditionalShelving key={`tube-${index}`} position={tube.position} color={tube.color} />
          ))}

          {/* Loading dock and CEDIS */}
          {loadingAreas.map((dock, index) => (
            <LoadingDock key={`loading-${index}`} position={dock.position} color={dock.color} />
          ))}

          <MovingForklift />

          {/* Zone labels for main areas only */}
          {allZones.map((zone) => (
            <Text
              key={`label-${zone.id}`}
              position={[zone.position[0], zone.position[1] + 4, zone.position[2]]}
              fontSize={0.5}
              color={selectedZone === zone.id ? "#ffffff" : "#a855f7"}
              anchorX="center"
              anchorY="middle"
            >
              {zone.name}
            </Text>
          ))}
        </Suspense>
      </Canvas>

      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Move3D className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">Tu Tienda Exacta en 3D</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <MousePointer className="w-3 h-3" />
            <span>Layout idéntico a tu plano</span>
          </div>
          <div>• 18 pasillos con designaciones LD/LI</div>
          <div>• Áreas especializadas exactas</div>
          <div>• Góndolas y cajas posicionadas</div>
          <div>• Andén y CEDIS incluidos</div>
        </div>
      </div>

      {selectedZone && (
        <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-4 border border-primary/20 animate-fade-in">
          <h4 className="font-semibold text-primary mb-2">{allZones.find((z) => z.id === selectedZone)?.name}</h4>
          <p className="text-sm text-muted-foreground">
            {selectedZone === "paqueteria" && "Área especializada para manejo y procesamiento de paquetería"}
            {selectedZone === "exhibicion" && "Zona de exhibición de productos destacados"}
            {selectedZone === "isla-maquinas" && "Isla central con maquinaria especializada"}
          </p>
        </div>
      )}
    </div>
  )
}

function HighlightsSection() {
  const [activeApp, setActiveApp] = useState(0)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [hoveredModule, setHoveredModule] = useState(null)

  const apps = [
    {
      id: "recibo",
      name: "Recibo",
      icon: Package,
      color: "from-primary/30 to-primary/10",
      description:
        "Optimización inteligente de rutas de picking con IA avanzada que revoluciona la recolección de productos",
      images: [
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop",
      ],
      features: [
        "Rutas optimizadas por IA",
        "Picking por lotes inteligente",
        "Validación por código de barras",
        "Métricas en tiempo real",
      ],
      stats: { efficiency: "+45%", errors: "-78%", time: "-32%" },
    },
    {
      id: "acomodo",
      name: "Acomodo",
      icon: Truck,
      color: "from-purple-600/30 to-purple-600/10",
      description: "Automatización completa del proceso de empaque y envío con algoritmos de optimización espacial",
      images: [
        "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1494412651409-afdab827c52f?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop",
      ],
      features: [
        "Cálculo automático de cajas",
        "Etiquetado inteligente",
        "Control de peso y dimensiones",
        "Integración con paqueterías",
      ],
      stats: { speed: "+60%", accuracy: "+95%", cost: "-25%" },
    },
    {
      id: "picking",
      name: "Picking",
      icon: BarChart3,
      color: "from-violet-600/30 to-violet-600/10",
      description: "Dashboard ejecutivo con insights predictivos y KPIs avanzados para toma de decisiones estratégicas",
      images: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop",
      ],
      features: ["Dashboards personalizables", "Predicciones con ML", "Alertas inteligentes", "Reportes automatizados"],
      stats: { insights: "+200%", decisions: "+85%", roi: "+150%" },
    },
    {
      id: "packing",
      name: "Packing",
      icon: Shield,
      color: "from-indigo-600/30 to-indigo-600/10",
      description: "Monitoreo y seguridad avanzada para proteger tu operación con tecnología de vanguardia",
      images: [
        "https://images.unsplash.com/photo-1563013544-8bd374c3f58b?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop",
      ],
      features: ["Monitoreo 24/7", "Detección de anomalías", "Control de accesos biométrico", "Auditorías automáticas"],
      stats: { security: "+99.9%", incidents: "-90%", compliance: "100%" },
    },
    {
      id: "despacho",
      name: "Despacho",
      icon: Shield,
      color: "from-indigo-600/30 to-indigo-600/10",
      description: "Monitoreo y seguridad avanzada para proteger tu operación con tecnología de vanguardia",
      images: [
        "https://images.unsplash.com/photo-1563013544-8bd374c3f58b?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop",
      ],
      features: ["Monitoreo 24/7", "Detección de anomalías", "Control de accesos biométrico", "Auditorías automáticas"],
      stats: { security: "+99.9%", incidents: "-90%", compliance: "100%" },
    },
  ]

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleAppChange = (index: number) => {
    if (index === activeApp) return
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveApp(index)
      setActiveImageIndex(0)
      setIsTransitioning(false)
    }, 150)
  }

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % apps[activeApp].images.length)
  }

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + apps[activeApp].images.length) % apps[activeApp].images.length)
  }

  return (
    <section className="relative py-24 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/6 left-1/6 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-2/3 right-1/6 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl animate-pulse-slow delay-2000" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
    
        <div className="text-center mb-16 scroll-reveal">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Interfaz Holográfica</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
            Módulos{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-violet-600/10 bg-clip-text text-transparent animate-gradient-x">
              holográficos
            </span>{" "}
            inteligentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Experimenta la próxima generación de interfaces con nuestro selector holográfico
          </p>
        </div>

        <div className="relative mb-12 scroll-reveal">
          <div className="relative h-80 rounded-3xl overflow-hidden bg-gradient-to-br from-background/50 via-primary/5 to-purple-600/10 border border-primary/20 backdrop-blur-xl">
            <div className="absolute inset-0 opacity-30">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                  linear-gradient(rgba(124, 58, 237, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(124, 58, 237, 0.1) 1px, transparent 1px)
                `,
                  backgroundSize: "40px 40px",
                  animation: "holographic-grid 20s linear infinite",
                }}
              />
            </div>

            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-primary/60 rounded-full animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${3 + Math.random() * 4}s`,
                  }}
                />
              ))}
            </div>
{/* Diseño de modulos */}
            <div className="relative h-full flex items-center justify-center">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 p-8">
                {apps.map((app, index) => {
                  const IconComponent = app.icon
                  const isActive = activeApp === index
                  const isHovered = hoveredModule === index

                  return (
                    <div
                      key={app.id}
                      className="relative group cursor-pointer"
                      onMouseEnter={() => setHoveredModule(index)}
                      onMouseLeave={() => setHoveredModule(null)}
                      onClick={() => handleAppChange(index)}
                      style={{
                        transform: `
                          perspective(1000px) 
                          rotateX(${isHovered ? -10 : 0}deg) 
                          rotateY(${isHovered ? 10 : 0}deg) 
                          translateZ(${isActive ? 50 : isHovered ? 30 : 0}px)
                          scale(${isActive ? 1.1 : isHovered ? 1.05 : 1})
                        `,
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      <div
                        className={`
                        relative p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300
                        ${
                          isActive
                            ? "bg-gradient-to-br from-primary/30 to-purple-600/20 border-primary/50 shadow-2xl shadow-primary/25"
                            : "bg-background/20 border-primary/20 hover:border-primary/40"
                        }
                      `}
                      >
                        <div
                          className={`
                          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
                          bg-gradient-to-r from-transparent via-primary/50 to-transparent
                          animate-shimmer
                        `}
                        />

                        <div
                          className={`
                          relative w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center transition-all duration-300
                          ${isActive ? "bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/25" : "bg-primary/10 group-hover:bg-primary/20"}
                        `}
                        >
                          <IconComponent
                            className={`w-6 h-6 transition-all duration-300 ${
                              isActive ? "text-white" : "text-primary"
                            }`}
                          />

                          {isActive && (
                            <div className="absolute inset-0 rounded-xl border-2 border-primary/50 animate-ping" />
                          )}
                        </div>

                        <h3
                          className={`
                          text-center font-semibold transition-all duration-300
                          ${isActive ? "text-primary" : "text-foreground group-hover:text-primary"}
                        `}
                        >
                          {app.name.replace("KRKN ", "")}
                        </h3>

                        {(isActive || isHovered) && (
                          <div className="absolute inset-0 pointer-events-none">
                            {[...Array(3)].map((_, i) => (
                              <div
                                key={i}
                                className="absolute w-px h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent animate-pulse"
                                style={{
                                  left: `${20 + i * 30}%`,
                                  animationDelay: `${i * 0.5}s`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {isActive && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-primary to-purple-600 rounded-full animate-pulse shadow-lg shadow-primary/50">
                          <div className="absolute inset-0 rounded-full border border-primary/50 animate-ping" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-primary/70">
              <Cpu className="w-3 h-3 animate-pulse" />
              <span>NEURAL INTERFACE v2.1</span>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-primary/70">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>ONLINE</span>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-primary/50">
              Selecciona un módulo para explorar sus capacidades
            </div>
          </div>
        </div>

        <div className="scroll-reveal">
          <Card
            className={`relative overflow-hidden border-primary/20 bg-gradient-to-br ${apps[activeApp].color} backdrop-blur-xl transition-all duration-300 ${
              isTransitioning ? "opacity-50 scale-95" : "opacity-100 scale-100"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-background/10 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(120,119,198,0.1),transparent_70%)]" />
            <div className="relative p-6 md:p-8">
              <div className="grid lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const IconComponent = apps[activeApp].icon
                        return (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-primary" />
                          </div>
                        )
                      })()}
                      <h3 key={`title-${activeApp}`} className="text-2xl font-bold animate-fade-in">
                        {apps[activeApp].name}
                      </h3>
                    </div>
                    <p
                      key={`desc-${activeApp}`}
                      className="text-base text-muted-foreground text-pretty animate-fade-in leading-relaxed"
                    >
                      {apps[activeApp].description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Características principales
                    </h4>
                    <div key={`features-${activeApp}`} className="grid sm:grid-cols-2 gap-3 animate-fade-in">
                      {apps[activeApp].features.map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-background/30 backdrop-blur-sm border border-primary/10"
                        >
                          <div className="w-2 h-2 bg-gradient-to-r from-primary to-purple-600 rounded-full" />
                          <span className="text-sm font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Resultados comprobados
                    </h4>
                    <div key={`stats-${activeApp}`} className="grid gap-4 animate-fade-in">
                      {Object.entries(apps[activeApp].stats).map(([key, value], index) => (
                        <div
                          key={key}
                          className="group p-4 rounded-lg bg-background/30 backdrop-blur-sm border border-primary/10"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium capitalize">
                              {key === "efficiency" && "Eficiencia"}
                              {key === "errors" && "Reducción de errores"}
                              {key === "time" && "Tiempo de proceso"}
                              {key === "speed" && "Velocidad"}
                              {key === "accuracy" && "Precisión"}
                              {key === "cost" && "Reducción de costos"}
                              {key === "insights" && "Insights generados"}
                              {key === "decisions" && "Mejores decisiones"}
                              {key === "roi" && "ROI"}
                              {key === "security" && "Nivel de seguridad"}
                              {key === "incidents" && "Reducción de incidentes"}
                              {key === "compliance" && "Cumplimiento"}
                            </span>
                            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                              {value}
                            </span>
                          </div>
                          <div className="h-2 bg-background/50 rounded-full overflow-hidden backdrop-blur-sm">
                            <div
                              className="h-full bg-gradient-to-r from-primary via-purple-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${Math.min(95, Math.abs(Number.parseInt(value.replace(/[^0-9.-]/g, ""))))}%`,
                                animationDelay: `${index * 200}ms`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="group bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg"
                  >
                    Explorar {apps[activeApp].name}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                <div key={`images-${activeApp}`} className="space-y-4 animate-fade-in">
                  <div className="relative group">
                    <div className="aspect-video rounded-xl overflow-hidden bg-background/20 backdrop-blur-sm border border-primary/20">
                      <img
                        src={apps[activeApp].images[activeImageIndex] || "/placeholder.svg"}
                        alt={`${apps[activeApp].name} screenshot ${activeImageIndex + 1}`}
                        className="w-full h-full object-cover transition-all duration-500"
                      />
                    </div>

                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-primary/20"
                    >
                      <ChevronLeft className="w-5 h-5 text-primary" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-primary/20"
                    >
                      <ChevronRight className="w-5 h-5 text-primary" />
                    </button>
                  </div>

                  <div className="flex justify-center gap-2">
                    {apps[activeApp].images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all backdrop-blur-sm ${
                          index === activeImageIndex
                            ? "bg-gradient-to-r from-primary to-purple-600"
                            : "bg-background/50 border border-primary/20 hover:bg-primary/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="text-center mt-16 scroll-reveal">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 via-purple-600/10 to-violet-600/10 border border-primary/20 backdrop-blur-sm">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Más de 500+ empresas ya utilizan estos módulos</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HighlightsSection

export { HighlightsSection }
