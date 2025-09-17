"use client";

import type React from "react";
import { useState } from "react";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validUsers = [
      { email: "MAR", password: "1" },
      { email: "MIGUEL", password: "1" },
    ];

    const user = validUsers.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (user) {
      window.location.href = "/dashboard";
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <>
      <div className="min-h-screen bg-black flex">
        {/* Panel izquierdo */}
        <div className="flex-[3] flex items-center justify-center p-8 relative overflow-hidden">
          {/* Partículas */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Fondo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/111.png"
              alt="3D Octopus"
              fill
              className="object-cover"
              style={{
                filter: "drop-shadow(0 0 30px rgba(43, 21, 85, 0.74))",
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-blue-500/30 to-transparent relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse" />
        </div>

        {/* Panel derecho */}
        {/* === LAYOUT COMPLETO (wallpaper izquierda + panel derecha) === */}
        <div className="flex min-h-[100dvh]">
          {/* IZQUIERDA: wallpaper (ajusta el src a tu imagen) */}
          <div
            className="relative flex-1 bg-cover bg-center"
            style={{ backgroundImage: "url('/krkn-wallpaper.png')" }} // <-- cambia por tu ruta real
          >
            {/* opcional: velo sutil para contraste */}
            <span className="absolute inset-0 bg-black/10" />
          </div>

          {/* DERECHA: controla el ANCHO aquí */}
          <aside
            className="
      relative flex items-stretch overflow-hidden shrink-0
      w-full              /* móvil: ocupa todo */
      md:basis-[46vw]     /* tablet */
      lg:basis-[40vw]     /* desktop */
      xl:basis-[34vw]     /* xl */
      2xl:basis-[32vw]    /* 2xl */
      min-w-[420px]       /* nunca más angosto que 420px */
      max-w-[720px]       /* nunca más ancho que 720px */
    "
          >
            {/* BLOBS líquidos (detrás del vidrio para que el backdrop-blur funcione) */}
            <span className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-fuchsia-500/35 blur-[100px]" />
            <span className="pointer-events-none absolute -right-28 top-1/3 h-96 w-96 rounded-full bg-cyan-400/25 blur-[110px]" />

            {/* CARD glass-liquid: ocupa alto y ancho completos del aside */}
            <div
              className="relative w-full h-full rounded-[28px] bg-white/10 backdrop-blur-2xl overflow-hidden
                 border border-white/20 ring-1 ring-white/10
                 shadow-[0_10px_60px_rgba(0,0,0,.45)]"
            >
              {/* reflejo superior + grosor */}
              <span
                className="pointer-events-none absolute inset-0 rounded-[28px]
                       [background:linear-gradient(180deg,rgba(255,255,255,.65),rgba(255,255,255,0)_55%)]
                       [mask-image:linear-gradient(to_bottom,white,transparent_62%)]"
              />
              <span
                className="pointer-events-none absolute inset-0 rounded-[28px]
                       [box-shadow:inset_0_1px_0_rgba(255,255,255,.45),inset_0_-1px_0_rgba(0,0,0,.35)]"
              />
              {/* brillo “sheen” sutil animado */}
              <span
                className="pointer-events-none absolute -inset-y-10 -left-10 w-1/3 rotate-12
                       bg-white/10 blur-xl opacity-70 animate-[sheen_6s_ease-in-out_infinite]"
              />

              {/* ===== CONTENIDO DEL FORM ===== */}
              <div className="relative flex h-full flex-col p-8">
                {/* Formulario centrado verticalmente */}
                <div className="flex flex-1 items-center justify-center">
                  <div className="w-full max-w-xs space-y-8">
                    {/* Logo (arriba del formulario) */}
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <Image
                          src="/gouwhite.png"
                          alt="Gouman Logo"
                          width={120}
                          height={120}
                        />
                      </div>
                      <h1 className="text-2xl font-semibold text-white">
                        GOUMAN
                      </h1>
                      <p className="text-3xl mt-1 font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                        Inicia Sesión
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label
                          htmlFor="email"
                          className="text-white/80 text-sm font-medium"
                        >
                          Email
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 w-5 h-5" />
                          <input
                            id="email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@krkn.com"
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-10 py-3
                               text-white placeholder-white/60
                               focus:outline-none focus:ring-2 focus:ring-violet-300/50 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="password"
                          className="text-white/80 text-sm font-medium"
                        >
                          Contraseña
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 w-5 h-5" />
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-10 py-3 pr-12
                               text-white placeholder-white/60
                               focus:outline-none focus:ring-2 focus:ring-violet-300/50 focus:border-transparent"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="text-red-300 text-sm text-center">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600
                           hover:from-violet-500 hover:to-fuchsia-500
                           text-white font-medium py-3 px-4 rounded-lg transition-all duration-200
                           border border-white/20 shadow-lg shadow-fuchsia-500/10"
                      >
                        ENTRAR
                      </button>
                    </form>

                    <div className="text-center space-y-3">
                      <button className="text-white/70 hover:text-white text-sm transition-colors">
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logo BS fijo abajo */}
                <div className="flex justify-center mt-auto">
                  <Image
                    src="/BS.png"
                    alt="black_sheep"
                    width={160}
                    height={50}
                    className="object-contain opacity-80"
                  />
                </div>
              </div>
              {/* ===== FIN CONTENIDO ===== */}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
