"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, CheckCircle, Shield, Zap } from "lucide-react"

export function ContactSection() {
  return (
    <section id="contact-section" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,69,255,0.1),transparent_70%)]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center scroll-reveal">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">¿Listo para transformar tu almacén?</h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto text-pretty">
            Déjanos tus datos y un especialista te contactará para una demo personalizada
          </p>

          <Card className="max-w-2xl mx-auto bg-card/80 border-primary/20 glass-effect backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nombre completo</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email empresarial</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                    placeholder="tu@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Empresa</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                    placeholder="Nombre de tu empresa"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Teléfono</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-foreground">¿Qué te interesa más?</label>
                <textarea
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder:text-muted-foreground resize-none"
                  rows={3}
                  placeholder="Cuéntanos sobre tu almacén y qué desafíos enfrentas..."
                />
              </div>

              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 text-lg quantum-button glow-intensify performance-optimized focus-ring mb-4"
              >
                Solicitar Demo Gratuita
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Al enviar este formulario, aceptas que un especialista de Black_Sheep se ponga en contacto contigo
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-center items-center gap-8 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Demo en 15 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Sin compromiso</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span>Respuesta en 24h</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
