"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Linkedin, Github, Mail, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

export default function EquipoPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentMember, setCurrentMember] = useState(0)
  const [dataStreams, setDataStreams] = useState<Array<{ left: string; delay: string }>>([])

  useEffect(() => {
    setIsVisible(true)
    const streams = Array.from({ length: 20 }, () => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 6}s`,
    }))
    setDataStreams(streams)
  }, [])

  const teamMembers = [
    {
      name: "Jeroboam Sanchez",
      role: "CEO & Founder",
      description:
        "Visionario tecnológico con 15+ años en logística y automatización. Experto en transformación digital de almacenes.",
      image: "./jero.png",
      linkedin: "#",
      github: "#",
      email: "alex@blacksheep.com",
    },
    {
      name: "Ivonne Espejel",
      role: "CTO & Co-founder",
      description:
        "Arquitecta de software especializada en sistemas distribuidos y AI. Líder en desarrollo de soluciones WMS de próxima generación.",
      image: "./ivonne.png",
      linkedin: "#",
      github: "#",
      email: "maria@blacksheep.com",
    },
    {
      name: "Edmundo Cortes",
      role: "Head of Innovation",
      description:
        "Especialista en IoT y robótica aplicada a almacenes. Pionero en integración de tentáculos mecánicos para picking automatizado.",
      image: "./jero.png",
      linkedin: "#",
      github: "#",
      email: "carlos@blacksheep.com",
    },
    {
      name: "Daniel Garcia",
      role: "Lead UX Designer",
      description:
        "Diseñadora de experiencias que humaniza la tecnología compleja. Creadora de interfaces intuitivas para operadores de almacén.",
      image: "./ivonne.png",
      linkedin: "#",
      github: "#",
      email: "sofia@blacksheep.com",
    },
  ]

  const nextMember = () => {
    setCurrentMember((prev) => (prev + 1) % teamMembers.length)
  }

  const prevMember = () => {
    setCurrentMember((prev) => (prev - 1 + teamMembers.length) % teamMembers.length)
  }

  const currentTeamMember = teamMembers[currentMember]

  return (
    <div className="min-h-screen bg-background plasma-background">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {dataStreams.map((stream, i) => (
            <div
              key={i}
              className="absolute w-px h-24 bg-gradient-to-b from-primary via-primary/60 to-transparent data-stream"
              style={{
                left: stream.left,
                animationDelay: stream.delay,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <Button
            variant="ghost"
            className="mb-8 text-primary hover:text-primary/80 hover:bg-primary/10"
            onClick={() => (window.location.href = "/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio
          </Button>

         
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 text-balance">
            <span className="text-foreground">Conoce al </span>
            <span className="text-primary premium-text hologram-effect">Equipo</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Los visionarios detrás de KRKN. Un equipo multidisciplinario que combina experiencia en logística,
            tecnología avanzada y diseño centrado en el usuario.
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div
            className={`relative overflow-hidden transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="flex flex-col lg:flex-row min-h-[800px] bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl rounded-3xl overflow-hidden">
              {/* Large Profile Image - Takes up most of the space */}
              <div className="lg:w-4/5 relative overflow-hidden">
                <img
                  src={currentTeamMember.image || "/placeholder.svg"}
                  alt={currentTeamMember.name}
                  className="w-full h-[600px] lg:h-[800px] object-contain object-center transition-all duration-700 hover:scale-105"
                />
              </div>

              {/* Compact Info Sidebar */}
              <div className="lg:w-1/5 p-6 lg:p-8 flex flex-col justify-center relative z-30 bg-background/60 backdrop-blur-sm">
                <div className="space-y-4">
                  {/* Role Badge */}
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">
                    {currentTeamMember.role}
                  </Badge>

                  {/* Name */}
                  <h2 className="text-2xl lg:text-3xl font-black text-foreground premium-text leading-tight">
                    {currentTeamMember.name}
                  </h2>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm leading-relaxed">{currentTeamMember.description}</p>

                  {/* Social Links - Compact horizontal layout */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                      onClick={() => window.open(currentTeamMember.linkedin, "_blank")}
                    >
                      <Linkedin className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                      onClick={() => window.open(currentTeamMember.github, "_blank")}
                    >
                      <Github className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                      onClick={() => (window.location.href = `mailto:${currentTeamMember.email}`)}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute top-1/2 left-8 transform -translate-y-1/2 z-40">
              <Button
                variant="ghost"
                size="lg"
                className="h-12 w-12 p-0 bg-background/80 backdrop-blur-sm hover:bg-primary/20 hover:text-primary transition-colors"
                onClick={prevMember}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </div>
            <div className="absolute top-1/2 right-8 lg:right-[22%] transform -translate-y-1/2 z-40">
              <Button
                variant="ghost"
                size="lg"
                className="h-12 w-12 p-0 bg-background/80 backdrop-blur-sm hover:bg-primary/20 hover:text-primary transition-colors"
                onClick={nextMember}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Carousel Indicators */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40">
              <div className="flex gap-2">
                {teamMembers.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentMember
                        ? "bg-primary scale-150"
                        : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
                    }`}
                    onClick={() => setCurrentMember(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
