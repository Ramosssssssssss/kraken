"use client";

import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function Invitations() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Hola KRKN");
  const [sending, setSending] = useState(false);
  const [list, setList] = useState<
    Array<{
      id: number;
      name: string;
      email: string;
      message: string;
      created_at: string;
    }>
  >([]);
  const [showForm, setShowForm] = useState(false);

  // fetch existing invitations on mount
  useEffect(() => {
    let mounted = true;
    fetch("/api/invitations")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data && Array.isArray(data.data)) setList(data.data);
      })
      .catch((err) => console.error("invitations fetch", err));
    return () => {
      mounted = false;
    };
  }, []);

  const validateEmail = (e: string) => /\S+@\S+\.\S+/.test(e);

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: "Error",
        description: "Nombre y correo son requeridos",
        variant: "destructive",
      });
      return;
    }
    if (!validateEmail(email)) {
      toast({
        title: "Error",
        description: "Correo no válido",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // placeholder: ajusta la ruta API según tu backend
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast({
          title: "Enviado",
          description: "Invitación enviada correctamente",
        });
        setName("");
        setEmail("");
        setMessage("Hola KRKN");
      } else {
        toast({
          title: "Error",
          description: data?.message || "Error al enviar invitación",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("invite error", err);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-light tracking-wide text-white/90">
          Invitar usuario
        </h4>
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">
          Envía una invitación por correo
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h5 className="text-sm text-white/70">Invitaciones enviadas</h5>
        <Button
          size="sm"
          onClick={() => setShowForm((s) => !s)}
          className="text-sm"
        >
          {showForm ? "Cerrar" : "Invitar"}
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 mb-4">
          No hay invitaciones previas
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {list.map((it) => (
            <div
              key={it.id}
              className="rounded-md border border-white/6 bg-white/3 p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-white/90">{it.name}</div>
                <div className="text-xs text-white/60">
                  {it.email} • {new Date(it.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-white/70">{it.message}</div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/8 bg-white/3 p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs text-white/70 mb-1">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white/90"
                placeholder="Nombre completo"
              />
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">Correo</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white/90"
                placeholder="correo@dominio.com"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs text-white/70 mb-1">
                Mensaje
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white/90 h-24"
              />
            </div>

            <div className="md:col-span-3 flex items-center justify-end">
              <Button
                type="submit"
                disabled={sending}
                className="bg-teal-400/10 border-teal-300/20 text-teal-300"
              >
                {sending ? "Enviando..." : "Enviar invitación"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
