"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { CompanyAccessModal } from "@/components/company-access-modal"

interface HeroSectionProps {
  isVisible: boolean
}

export function HeroSection({ isVisible }: HeroSectionProps) {
  const [dataStreams, setDataStreams] = useState<Array<{ left: string; delay: string }>>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const streams = [...Array(25)].map(() => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 6}s`,
    }))
    setDataStreams(streams)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 plasma-background">
      <div className="absolute top-6 right-6 z-20">
        <span
          className="text-muted-foreground/60 text-sm hover:text-muted-foreground/80 transition-colors cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          Inicia Sesión
        </span>
      </div>

      <CompanyAccessModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className="absolute inset-0">
        <img
          src="/dark-futuristic-warehouse-with-giant-kraken-tentac.png"
          alt=""
          className="w-full h-full object-cover opacity-30 parallax-slow gpu-accelerated"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-muted/80" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="morphing-tentacle absolute top-20 left-10 w-32 h-32 opacity-20 neural-pulse hologram-effect">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-primary">
            <path d="M20,80 Q30,20 50,40 Q70,60 80,20" stroke="currentColor" strokeWidth="3" fill="none" />
          </svg>
        </div>
        <div
          className="morphing-tentacle absolute bottom-20 right-10 w-40 h-40 opacity-15 neural-pulse hologram-effect"
          style={{ animationDelay: "1s" }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full fill-primary">
            <path d="M80,20 Q70,80 50,60 Q30,40 20,80" stroke="currentColor" strokeWidth="3" fill="none" />
          </svg>
        </div>

        <div className="particle-float absolute top-1/2 left-1/4 w-6 h-6 bg-primary/30 rounded-full quantum-flicker energy-core" />
        <div
          className="particle-float absolute top-1/3 right-1/3 w-4 h-4 bg-primary/20 rounded-full quantum-flicker energy-core"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="particle-float absolute bottom-1/3 left-1/2 w-3 h-3 bg-primary/25 rounded-full quantum-flicker energy-core"
          style={{ animationDelay: "4s" }}
        />
        <div
          className="particle-float absolute top-2/3 right-1/4 w-5 h-5 bg-primary/15 rounded-full quantum-flicker energy-core"
          style={{ animationDelay: "3s" }}
        />

        <div className="absolute inset-0 opacity-5">
          {dataStreams.map((stream, i) => (
            <div
              key={i}
              className="absolute w-px h-24 bg-gradient-to-b from-primary via-primary/60 to-transparent data-stream hologram-effect"
              style={{
                left: stream.left,
                animationDelay: stream.delay,
              }}
            />
          ))}
        </div>
      </div>

      <div
        className={`relative z-10 text-center max-w-4xl mx-auto transition-all duration-1000 cinematic-entrance ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      >
           <div
          className="w-170 h-170 mx-auto mb-4 bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: "url('/kraken6.png')" }}
        />


        <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 transition-colors glass-effect micro-bounce quantum-button">
          black_sheep®
        </Badge>

        <h1
          className="text-6xl sm:text-7xl lg:text-8xl font-black mb-6 text-balance kraken-emerge cyber-title"
          data-text="KRKN"
        >
          <span className="text-foreground digital-artifact">KR</span>
          <span className="text-primary premium-text hologram-effect">K</span>
          <span className="text-foreground digital-artifact">N</span>
        </h1>

        <p className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-primary slide-in-left premium-text hologram-effect">
          Domina tu almacén con la fuerza del kraken
        </p>

        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty slide-in-right">
          El sistema de gestión de almacenes más poderoso y disruptivo del mercado. Controla cada tentáculo de tu
          operación logística.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center scale-in fade-in-sequence">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 text-lg quantum-button glow-intensify performance-optimized focus-ring"
            onClick={() => {
              const contactSection = document.getElementById("contact-section")
              if (contactSection) {
                contactSection.scrollIntoView({ behavior: "smooth" })
              }
            }}
          >
            <span className="relative z-10">Solicitar Demo</span>
            <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-primary text-primary hover:bg-primary/10 font-bold px-8 py-4 text-lg bg-transparent physics-hover glass-effect quantum-button focus-ring"
            onClick={() => (window.location.href = "/equipo")}
          >
            Conoce al equipo
          </Button>
        </div>
      </div>
    </section>
  )
}

export { HeroSection as default }
