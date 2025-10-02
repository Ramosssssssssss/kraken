// app/planes/success/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Success() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.push("/dashboard");
    }, 5000); // 5 segundos
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 flex items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <div className="text-emerald-400 text-2xl">✅ Pago exitoso</div>
        <h1 className="text-3xl font-semibold">¡Gracias por tu suscripción!</h1>
        <p className="text-zinc-400">
          Serás redirigido al inicio en unos segundos…
        </p>
        <a
          href="/dashboard"
          className="inline-block rounded-lg border border-zinc-700 px-4 py-2 hover:bg-white/10 transition"
        >
          Ir ahora
        </a>
      </div>
    </div>
  );
}
