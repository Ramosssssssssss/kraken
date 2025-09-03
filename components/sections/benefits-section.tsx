import { Card, CardContent } from "@/components/ui/card"
import { Package, Zap, Target, Shield } from "lucide-react"

export function BenefitsSection() {
  const benefits = [
    {
      icon: <Package className="h-8 w-8" />,
      title: "Control Total del Inventario",
      description: "Visibilidad completa en tiempo real de cada producto en tu almacén",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Integración con E-commerce",
      description: "Conecta seamlessly con todas tus plataformas de venta online",
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Optimización del Picking",
      description: "Rutas inteligentes que reducen tiempos y aumentan eficiencia",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Reducción de Errores",
      description: "Automatización que elimina errores humanos y mejora precisión",
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal-on-scroll">
          <h2
            className="text-4xl sm:text-5xl font-black mb-4 text-balance cyber-title"
            data-text="Beneficios que Dominan"
          >
            Beneficios que <span className="text-primary text-glow hologram-effect">Dominan</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Cada tentáculo de KRKN está diseñado para optimizar tu operación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className={`bg-card border-border hover:border-primary/50 transition-all duration-300 physics-hover group glass-effect reveal-on-scroll butter-smooth stagger-${index + 1} wave-border`}
            >
              <CardContent className="p-6 text-center">
                <div className="mb-4 text-primary group-hover:scale-110 transition-transform duration-300 flex justify-center group-hover:text-glow digital-artifact">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-balance">{benefit.title}</h3>
                <p className="text-muted-foreground text-pretty">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
