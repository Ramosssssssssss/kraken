"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Package,
  Truck,
  BarChart3,
  Shield,
  ChevronRight,
  Zap,
  Target,
  Users,
  ChevronLeft,
  Warehouse,
  ArrowRight,
  Database,
  Cpu,
  Globe,
} from "lucide-react"

export function HighlightsSection() {
  const [activeApp, setActiveApp] = useState(0)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [wmsStep, setWmsStep] = useState(0)

  const apps = [
    {
      id: "picking",
      name: "KRKN Picking",
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
      id: "packing",
      name: "KRKN Packing",
      icon: Truck,
      color: "from-purple-600/30 to-purple-600/10",
      description: "Automatización completa del proceso de empaque y envío con algoritmos de optimización espacial",
      images: [
        "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
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
      id: "analytics",
      name: "KRKN Analytics",
      icon: BarChart3,
      color: "from-violet-600/30 to-violet-600/10",
      description: "Dashboard ejecutivo con insights predictivos y KPIs avanzados para toma de decisiones estratégicas",
      images: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&h=400&fit=crop",
      ],
      features: ["Dashboards personalizables", "Predicciones con ML", "Alertas inteligentes", "Reportes automatizados"],
      stats: { insights: "+200%", decisions: "+85%", roi: "+150%" },
    },
    {
      id: "security",
      name: "KRKN Security",
      icon: Shield,
      color: "from-indigo-600/30 to-indigo-600/10",
      description: "Monitoreo y seguridad avanzada para proteger tu operación con tecnología de vanguardia",
      images: [
        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop",
      ],
      features: ["Monitoreo 24/7", "Detección de anomalías", "Control de accesos biométrico", "Auditorías automáticas"],
      stats: { security: "+99.9%", incidents: "-90%", compliance: "100%" },
    },
  ]

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

  const wmsSteps = [
    {
      icon: Database,
      title: "Gestión Inteligente",
      description: "Control total del inventario en tiempo real con IA avanzada",
      color: "from-primary/20 to-primary/10",
    },
    {
      icon: Cpu,
      title: "Automatización",
      description: "Procesos automatizados que eliminan errores humanos",
      color: "from-purple-600/20 to-purple-600/10",
    },
    {
      icon: Globe,
      title: "Integración Total",
      description: "Conecta seamlessly con todo tu ecosistema empresarial",
      color: "from-violet-600/20 to-violet-600/10",
    },
  ]

  return (
    <section className="relative py-24 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/6 left-1/6 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-2/3 right-1/6 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl animate-pulse-slow delay-2000" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-20 scroll-reveal">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
              <Warehouse className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Sistema WMS</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
              ¿Qué es un{" "}
              <span className="bg-gradient-to-r from-primary via-purple-400 to-violet-400 bg-clip-text text-transparent animate-gradient-x">
                WMS?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto text-pretty leading-relaxed mb-12">
              Un <strong>Warehouse Management System</strong> es el cerebro digital que coordina, optimiza y automatiza
              cada proceso de tu almacén
            </p>
          </div>

          {/* Interactive WMS Steps */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {wmsSteps.map((step, index) => (
              <div
                key={index}
                className={`group cursor-pointer transition-all duration-500 ${
                  wmsStep === index ? "scale-105" : "hover:scale-102"
                }`}
                onClick={() => setWmsStep(index)}
                onMouseEnter={() => setWmsStep(index)}
              >
                <div
                  className={`relative p-8 rounded-2xl bg-gradient-to-br ${step.color} backdrop-blur-xl border border-primary/20 transition-all duration-500 ${
                    wmsStep === index ? "shadow-2xl shadow-primary/25 border-primary/40" : "hover:border-primary/30"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-background/10 to-transparent rounded-2xl" />
                  <div className="relative space-y-4">
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/30 flex items-center justify-center transition-all duration-500 ${
                        wmsStep === index ? "scale-110 shadow-lg" : ""
                      }`}
                    >
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                    {wmsStep === index && (
                      <div className="flex items-center gap-2 text-primary font-medium animate-fade-in">
                        <span className="text-sm">Activo</span>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Central WMS Visualization */}
          <div className="relative max-w-2xl mx-auto">
            <div className="aspect-video rounded-3xl bg-gradient-to-br from-primary/10 via-purple-600/10 to-violet-600/10 backdrop-blur-xl border border-primary/20 p-12 flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl">
                    <Warehouse className="w-16 h-16 text-white" />
                  </div>
                  {/* Animated rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold">KRKN WMS</h3>
                  <p className="text-lg text-muted-foreground">La evolución de la gestión logística</p>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary/20 rounded-full animate-float" />
                <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-purple-600/20 rounded-full animate-float delay-1000" />
                <div className="absolute top-1/2 -right-8 w-4 h-4 bg-violet-600/20 rounded-full animate-float delay-2000" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-16 scroll-reveal">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Aplicaciones Especializadas</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
            Módulos que{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-violet-400 bg-clip-text text-transparent animate-gradient-x">
              revolucionan
            </span>{" "}
            tu almacén
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Cada aplicación KRKN está diseñada para optimizar procesos específicos y maximizar la eficiencia operacional
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-12 scroll-reveal">
          {apps.map((app, index) => {
            const IconComponent = app.icon
            return (
              <Button
                key={app.id}
                variant={activeApp === index ? "default" : "outline"}
                size="lg"
                onClick={() => handleAppChange(index)}
                disabled={isTransitioning}
                className={`group transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${
                  activeApp === index
                    ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25 scale-105 border-primary/50"
                    : "bg-background/50 hover:bg-primary/10 hover:border-primary/50 hover:scale-105 border-primary/20"
                }`}
              >
                <IconComponent className="w-5 h-5 mr-2" />
                {app.name}
                {activeApp === index && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-md animate-pulse" />
                )}
              </Button>
            )
          })}
        </div>

        <div className="scroll-reveal">
          <Card
            className={`relative overflow-hidden border-primary/20 bg-gradient-to-br ${apps[activeApp].color} backdrop-blur-xl transition-all duration-300 ${
              isTransitioning ? "opacity-50 scale-95" : "opacity-100 scale-100"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-background/10 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(120,119,198,0.1),transparent_70%)]" />
            <div className="relative p-8 md:p-12">
              <div className="grid lg:grid-cols-3 gap-12 items-center">
                {/* Content */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const IconComponent = apps[activeApp].icon
                        return (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-primary" />
                          </div>
                        )
                      })()}
                      <h3 key={`title-${activeApp}`} className="text-3xl font-bold animate-fade-in">
                        {apps[activeApp].name}
                      </h3>
                    </div>
                    <p
                      key={`desc-${activeApp}`}
                      className="text-lg text-muted-foreground text-pretty animate-fade-in leading-relaxed"
                    >
                      {apps[activeApp].description}
                    </p>
                  </div>

                  {/* Features */}
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

                  {/* Stats */}
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

                    {/* Navigation Arrows */}
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

                  {/* Image Indicators */}
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

        {/* Bottom CTA */}
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
