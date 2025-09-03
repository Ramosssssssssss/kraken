"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Package, Brain, Route, Truck, Play, Pause } from "lucide-react"

export function HowItWorksSection() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const steps = [
    {
      step: "01",
      title: "Entrada de Mercancía",
      description: "Registro automático con códigos de barras y RFID para control total desde el primer momento",
      icon: Package,
      preview: "Escaneo inteligente → Validación automática → Asignación de ubicaciones",
      mockup: "/warehouse-scanning-interface-with-barcode-scanner.jpg",
      stats: { accuracy: "99.8%", speed: "2.3 seg/item", efficiency: "+45%" },
    },
    {
      step: "02",
      title: "Organización Inteligente",
      description: "Algoritmos que optimizan la ubicación de productos basados en frecuencia y rotación",
      icon: Brain,
      preview: "Análisis IA → Optimización espacial → Asignación inteligente",
      mockup: "/ai-warehouse-optimization-dashboard-with-heatmaps.jpg",
      stats: { optimization: "87%", space: "+32%", retrieval: "-40%" },
    },
    {
      step: "03",
      title: "Picking Eficiente",
      description: "Rutas optimizadas que reducen tiempos de recorrido y aumentan productividad",
      icon: Route,
      preview: "Rutas dinámicas → Guías visuales → Picking optimizado",
      mockup: "/warehouse-route-optimization-mobile-app-interface.jpg",
      stats: { routes: "Óptimas", time: "-55%", productivity: "+68%" },
    },
    {
      step: "04",
      title: "Despacho Preciso",
      description: "Verificación automática y tracking en tiempo real para entregas perfectas",
      icon: Truck,
      preview: "Validación final → Etiquetado automático → Tracking completo",
      mockup: "/shipping-verification-and-tracking-dashboard-inter.jpg",
      stats: { accuracy: "99.9%", tracking: "Real-time", errors: "-92%" },
    },
  ]

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length)
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length)
  }

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/30 rounded-full blur-2xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4 text-balance">
            Demo <span className="text-primary text-glow">KRKN</span> en Acción
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Experimenta paso a paso cómo KRKN transforma tu almacén
          </p>
        </div>

        <div className="bg-gradient-to-br from-background/80 to-primary/5 backdrop-blur-sm border border-primary/20 rounded-3xl p-8 lg:p-12 shadow-2xl">
          {/* Demo Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{currentStepData.title}</h3>
                <p className="text-primary font-medium">Paso {currentStepData.step} de 04</p>
              </div>
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 bg-primary/20 hover:bg-primary/30 rounded-full flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
          </div>

          {/* Main Demo Area */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Visual Mockup */}
            <div className="relative">
              <div className="aspect-[4/3] bg-gradient-to-br from-background/50 to-primary/10 rounded-2xl border border-primary/20 overflow-hidden">
                <img
                  src={currentStepData.mockup || "/placeholder.svg"}
                  alt={`Demo de ${currentStepData.title}`}
                  className="w-full h-full object-cover"
                />
                {/* Overlay with step indicator */}
                <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white font-bold text-sm">DEMO EN VIVO</span>
                </div>
              </div>
            </div>

            {/* Process Details */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold mb-3">Proceso:</h4>
                <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                  <p className="text-primary font-medium">{currentStepData.preview}</p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-3">Descripción:</h4>
                <p className="text-muted-foreground leading-relaxed">{currentStepData.description}</p>
              </div>

              {/* Stats */}
              <div>
                <h4 className="text-lg font-semibold mb-3">Resultados:</h4>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(currentStepData.stats).map(([key, value]) => (
                    <div key={key} className="bg-background/50 rounded-lg p-3 text-center border border-primary/10">
                      <div className="text-primary font-bold text-lg">{value}</div>
                      <div className="text-xs text-muted-foreground capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-background/50 hover:bg-primary/10 rounded-xl border border-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              <span>Anterior</span>
            </button>

            {/* Step Indicators */}
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentStep === index
                      ? "bg-primary scale-125 shadow-lg shadow-primary/50"
                      : "bg-primary/30 hover:bg-primary/50"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextStep}
              disabled={currentStep === steps.length - 1}
              className="flex items-center space-x-2 px-6 py-3 bg-primary/20 hover:bg-primary/30 rounded-xl border border-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Siguiente</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">¿Quieres ver KRKN en acción en tu almacén?</p>
          <button
            onClick={() => document.getElementById("contact-section")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            Solicitar Demo Personalizada
          </button>
        </div>
      </div>
    </section>
  )
}
