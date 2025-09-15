"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Clock, CheckCircle, Zap } from "lucide-react";
import { useState } from "react";

export function DifferentiatorsSection() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const differentiators = [
    {
      icon: <Users className="h-12 w-12" />,
      title: "Consultoría Experta",
      description:
        "En 2025 nos convertimos en empresa independiente para llevar al mercado lo que ya estaba probado en casa por más de 3 años.",
      features: [
        "Experiencia real en operación logística",
        "Soluciones validadas en uso interno",
        "Implementación con Know-How propio",
      ],
      color: "from-primary/20 to-purple-600/20",
    },
    {
      icon: <TrendingUp className="h-12 w-12" />,
      title: "Personalización Total",
      description:
        "KRKN se adapta a tu operación, no al revés. Configuración flexible para cualquier industria.",
      features: [
        //"WORKFLOWS ADAPTADOS A TU OPERACION",
        "Workflows personalizados",
        "Integraciones a medida",
        //"Integraciones con ERP, POS, WMS",
        "Escalabilidad garantizada",
       // "Escalabilidad lista para crecer contigo",
      ],
      color: "from-purple-600/20 to-violet-600/20",
    },
    {
      icon: <Clock className="h-12 w-12" />,
      title: "Soporte con ADN propio",
      description:
        "Usamos lo que desarrollamos. Por eso nuestro soporte no es de manual, sino de gente que sabe cómo duele la operación.",
      features: [
        "Soporte 24/7",
        "SLA garantizado",
        "Actualizaciones incluidas sin costo",
      ],
      color: "from-violet-600/20 to-primary/20",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{
          backgroundImage:
            "url('/dark-futuristic-warehouse-with-giant-kraken-tentac.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-background/65 to-primary/10">
        {/* Energy particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full animate-pulse"
            style={{
              left: `${20 + i * 10}%`,
              top: `${30 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: "3s",
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 scroll-reveal">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <svg
                width="50"
                height="50"
                viewBox="0 0 100 100"
                className="fill-primary animate-pulse"
              >
                <path d="M20 60c0-15 10-25 25-25s25 10 25 25c5-5 15-5 20 0 0 10-5 15-15 15H25c-5 0-5-15 0-15z" />
                <circle cx="45" cy="45" r="8" className="fill-primary" />
                <path d="M35 70h20v15H35z" className="fill-primary" />
              </svg>
              <div className="absolute -inset-2 bg-primary/20 rounded-full blur-md animate-pulse"></div>
            </div>
            <Zap className="h-8 w-8 text-primary animate-bounce" />
          </div>

          <h2 className="text-4xl sm:text-5xl font-black mb-4 text-balance">
            Por Qué{" "}
            <span className="text-primary text-glow animate-pulse">
              black_sheep®
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            No somos como los demás. Somos la{" "}
            <span className="text-primary font-semibold">oveja negra</span> que
            lidera la manada.
          </p>

          <div className="mt-4 text-sm text-primary/80 font-mono">
            &gt; Disruptores_por_naturaleza.exe
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {differentiators.map((diff, index) => (
            <Card
              key={index}
              className={`group relative overflow-hidden bg-background/40 backdrop-blur-md border border-primary/20 hover:border-primary/60 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 scroll-reveal stagger-${
                index + 1
              }`}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${diff.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" />

              <CardContent className="relative p-8 z-10">
                <div className="text-primary mb-6 flex justify-center relative">
                  <div className="relative">
                    {diff.icon}
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4 text-center text-balance group-hover:text-primary transition-colors duration-300">
                  {diff.title}
                </h3>

                <p className="text-muted-foreground mb-6 text-center text-pretty group-hover:text-foreground/90 transition-colors duration-300">
                  {diff.description}
                </p>

                <ul className="space-y-3">
                  {diff.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className={`flex items-center text-sm transition-all duration-300 ${
                        hoveredCard === index ? "translate-x-2" : ""
                      }`}
                      style={{ transitionDelay: `${idx * 100}ms` }}
                    >
                      <CheckCircle className="h-4 w-4 text-primary mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                      <span className="group-hover:text-foreground transition-colors duration-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="absolute bottom-4 right-4 opacity-5 group-hover:opacity-20 transition-opacity duration-500">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 100 100"
                    className="fill-primary"
                  >
                    <path d="M20 60c0-15 10-25 25-25s25 10 25 25c5-5 15-5 20 0 0 10-5 15-15 15H25c-5 0-5-15 0-15z" />
                    <circle cx="45" cy="45" r="8" className="fill-primary" />
                    <path d="M35 70h20v15H35z" className="fill-primary" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 text-sm text-primary/60 font-mono">
            <span>&lt;</span>
            <span>Diferentes por diseño</span>
            <span>/&gt;</span>
          </div>
        </div>
      </div>
    </section>
  );
}
