export function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Entrada de Mercancía",
      description: "Registro automático con códigos de barras y RFID",
    },
    {
      step: "02",
      title: "Organización Inteligente",
      description: "Algoritmos que optimizan la ubicación de productos",
    },
    {
      step: "03",
      title: "Picking Eficiente",
      description: "Rutas optimizadas para máxima productividad",
    },
    {
      step: "04",
      title: "Despacho Preciso",
      description: "Verificación automática y tracking en tiempo real",
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 scroll-reveal">
          <h2 className="text-4xl sm:text-5xl font-black mb-4 text-balance">
            Cómo Funciona <span className="text-primary text-glow">KRKN</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Un proceso fluido como los tentáculos del kraken
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className={`relative scroll-reveal stagger-${index + 1}`}>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-black mb-4 mx-auto pulse-glow hover-lift neon-border matrix-text">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold mb-3 text-balance">{step.title}</h3>
                <p className="text-muted-foreground text-pretty">{step.description}</p>
              </div>
              {index < 3 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30 transform -translate-y-1/2">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
