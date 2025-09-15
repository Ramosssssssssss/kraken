import { Button } from "@/components/ui/button"

export function FooterSection() {
  return (
    <footer className="relative bg-gradient-to-b from-background to-black/95 border-t border-primary/20 overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-3">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-full bg-gradient-to-b from-primary/10 via-transparent to-primary/10 data-stream"
            style={{
              left: `${8 + i * 7}%`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* Elegant floating elements */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-16 left-16 w-24 h-24 morphing-tentacle">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path
              d="M20,50 Q40,20 60,40 Q80,60 90,30"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              className="text-primary"
            />
          </svg>
        </div>
        <div className="absolute bottom-16 right-16 w-32 h-32 morphing-tentacle" style={{ animationDelay: "3s" }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path
              d="M80,50 Q60,80 40,60 Q20,40 10,70"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              className="text-primary"
            />
          </svg>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 from-primary to-primary/80 rounded-xl flex items-center justify-center pulse-glow shadow-lg">
<div
          className="w-14 h-14 mx-auto mb-1 bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: "url('/kraken6.png')" }}
        />              </div>
              <div>
                <h3 className="text-3xl font-black text-foreground tracking-tight">KRKN</h3>
                <p className="text-sm text-primary font-semibold tracking-wide">Powered by black_sheep® </p>
              </div>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
              Revolucionamos la gestión de almacenes con tecnología de vanguardia. Domina cada aspecto de tu operación
              logística con la precisión del kraken.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 glass-effect quantum-button bg-transparent transition-all duration-300"
              >
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 glass-effect quantum-button bg-transparent transition-all duration-300"
              >
                Instagram
              </Button>
            </div>
          </div>

          {/* Solutions */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-foreground border-b border-primary/20 pb-2">Soluciones</h4>
            <ul className="space-y-3">
              {[
                "Gestión de Inventario",
                "Optimización de Picking",
                "Integración E-commerce",
                "Analytics Avanzado",
                "Automatización WMS",
              ].map((item, i) => (
                <li key={i}>
                  <a
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-all duration-300 hover:translate-x-2 transform inline-block group"
                  >
                    <span className="group-hover:text-glow">{item}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-foreground border-b border-primary/20 pb-2">Empresa</h4>
            <ul className="space-y-3">
              {["Sobre Black_Sheep", "Casos de Éxito", "Soporte Premium", "Contacto", "Recursos"].map((item, i) => (
                <li key={i}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Elegant divider */}
        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-background px-8">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full pulse-glow" />
                <div className="w-3 h-3 bg-primary/60 rounded-full pulse-glow" style={{ animationDelay: "0.5s" }} />
                <div className="w-2 h-2 bg-primary rounded-full pulse-glow" style={{ animationDelay: "1s" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
          <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-8">
            <p className="text-muted-foreground text-sm font-medium">
              © 2025 Black Sheep Labs. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
                Aviso de Privacidad
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">
                Términos y Condiciones del Servicio
              </a>
              
            </div>
          </div>

          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <span>Powered by black_sheep®</span>
            <div className="w-4 h-4 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse shadow-sm" />
            <span className="font-medium">México</span>
          </div>
        </div>
      </div>

      {/* Subtle bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </footer>
  )
}
