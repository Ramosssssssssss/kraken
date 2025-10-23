"use client";

import { Globe } from "lucide-react";

export function ConfigLanguageRegion() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-light tracking-wide text-white/90">
          Idioma & Región
        </h4>
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">
          Configuración de idioma y región
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <Globe className="mx-auto h-12 w-12 text-white/30" />
        <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">
          Idioma & Región
        </h5>
        <p className="mt-2 text-sm font-light tracking-wide text-white/50">
          Selecciona el idioma y región del sistema MODULADO CORRECTO
        </p>
      </div>
    </div>
  );
}
