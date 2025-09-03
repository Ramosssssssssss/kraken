import { Card, CardContent } from "@/components/ui/card"
import { Users, TrendingUp, Clock, CheckCircle } from "lucide-react"

export function DifferentiatorsSection() {
  const differentiators = [
    {
      icon: <Users className="h-12 w-12" />,
      title: "Consultoría Experta",
      description: "15+ años de experiencia en logística y tecnología. Nuestro equipo entiende tu negocio.",
      features: ["Análisis personalizado", "Implementación guiada", "Mejores prácticas"],
    },
    {
      icon: <TrendingUp className="h-12 w-12" />,
      title: "Personalización Total",
      description: "KRKN se adapta a tu operación, no al revés. Configuración flexible para cualquier industria.",
      features: ["Workflows personalizados", "Integraciones a medida", "Escalabilidad garantizada"],
    },
    {
      icon: <Clock className="h-12 w-12" />,
      title: "Soporte Premium",
      description: "Soporte 24/7 con tiempos de respuesta garantizados. Tu éxito es nuestro éxito.",
      features: ["Soporte 24/7", "SLA garantizado", "Actualizaciones continuas"],
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 scroll-reveal">
          <h2 className="text-4xl sm:text-5xl font-black mb-4 text-balance">
            Por Qué <span className="text-primary text-glow">Black_Sheep</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            No somos como los demás. Somos la oveja negra que lidera la manada.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {differentiators.map((diff, index) => (
            <Card
              key={index}
              className={`bg-card border-border hover:border-primary/50 transition-all duration-300 hover-lift glass-effect neon-border scroll-reveal stagger-${index + 1}`}
            >
              <CardContent className="p-8">
                <div className="text-primary mb-6 flex justify-center group-hover:text-glow transition-all duration-300">
                  {diff.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center text-balance">{diff.title}</h3>
                <p className="text-muted-foreground mb-6 text-center text-pretty">{diff.description}</p>
                <ul className="space-y-2">
                  {diff.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
