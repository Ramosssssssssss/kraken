"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Lock } from "lucide-react"

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  const plans = [
    {
      name: "Básico",
      description: "Perfecto para almacenes pequeños comenzando su transformación",
      monthlyPrice: 2500,
      annualPrice: 25000,
      features: [
        "Gestión básica de inventario",
        "Hasta 1,000 productos",
        "1 usuario incluido",
        "Reportes básicos",
        "Soporte por email",
        "Integración con 1 plataforma",
      ],
      cta: "Comenzar Ahora",
      popular: false,
    },
    {
      name: "Profesional",
      description: "Ideal para empresas en crecimiento que buscan optimización",
      monthlyPrice: 1050,
      annualPrice: 11550,
      features: [
        "SIN LÍMITES DE USUARIOS",
        "Actualizaciones Incluidas",
        "Recepción (Control de Entradas)",
        "Picking (Preparación de Pedidos)",
        "Packing (Empaque y Envío)",
        "Acomodo (Organización de Inventario)",
        "Despacho (Gestión de Salidas)",
        "Integración con ERP (MICROSIP)",
      ],
      cta: "Empezar Prueba",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "Soluciones personalizadas para operaciones a gran escala",
      monthlyPrice: 25000,
      annualPrice: 250000,
      features: [
        "Todo en Profesional +",
        "Usuarios ilimitados",
        "Múltiples almacenes",
        "IA personalizada",
        "Integración dedicada",
        "Seguridad enterprise",
        "Gerente de cuenta dedicado",
        "SLA garantizado",
      ],
      cta: "Contactar Ventas",
      popular: false,
    },
  ]

  return (
    <section className="relative py-24 bg-background overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,69,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(139,69,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent">
            Precios Diseñados para Cada Almacén
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Elige el plan que se adapte a tu operación logística, desde almacenes pequeños hasta corporaciones
            multinacionales.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm ${!isAnnual ? "text-white" : "text-muted-foreground"}`}>Mensual</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                isAnnual ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                  isAnnual ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm ${isAnnual ? "text-white" : "text-muted-foreground"}`}>
              Anual
              <span className="ml-1 text-xs text-primary font-medium">(1 mes gratis)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? "bg-gradient-to-b from-primary/20 to-primary/5 border-2 border-primary shadow-2xl shadow-primary/20"
                  : "bg-card/50 border border-border/50 hover:border-primary/30 blur-[1px] opacity-80"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Más Popular
                  </div>
                </div>
              )}

              {!plan.popular ? (
                <div className="text-center h-full flex flex-col items-center justify-center">
                  <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                  <Lock className="w-16 h-16 text-primary/60 mb-4" />
                  <p className="text-xl font-semibold text-primary mb-2">Próximamente...</p>
                  <p className="text-muted-foreground text-sm">Aprovecha el plan PROFESIONAL antes de que cambien las condiciones</p>
                </div>
              ) : (
                <>
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">
                          ${(isAnnual ? plan.annualPrice : plan.monthlyPrice).toLocaleString("es-MX")}
                        </span>
                        <span className="text-muted-foreground">MXN/{isAnnual ? "año" : "mes"}</span>
                      </div>
                      {isAnnual && (
                        <p className="text-sm text-primary mt-1">
                          Ahorra un 1 mes gratis al año
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => {
                      const contactSection = document.getElementById("contact-section")
                      contactSection?.scrollIntoView({ behavior: "smooth" })
                    }}
                  >
                    {plan.cta}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            ¿Necesitas una solución personalizada? Nuestro equipo está listo para ayudarte.
          </p>
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
            onClick={() => {
              const contactSection = document.getElementById("contact-section")
              contactSection?.scrollIntoView({ behavior: "smooth" })
            }}
          >
            Hablar con un Especialista
          </Button>
        </div>
      </div>
    </section>
  )
}
