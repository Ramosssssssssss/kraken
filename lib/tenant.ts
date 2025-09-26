// lib/tenant.ts
export function getTenantFromHost(hostname: string) {
  const parts = hostname.split(".")
  // foo.krkn.mx => "foo" (ajusta si tienes más niveles)
  return parts.length >= 3 ? parts[0].toLowerCase() : null
}

export function resolveApiUrlDeterministic(tenant: string | null) {
  if (!tenant) return null
  return `https://api.${tenant}.krkn.mx` // ajusta a tu patrón real
}

export async function resolveApiUrlDynamic(tenant: string | null) {
  if (!tenant) return null
  try {
    const res = await fetch("https://picking-backend.onrender.com/check-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa: tenant }),
    })
    const data = await res.json()
    return data?.ok && data?.cliente?.apiUrl ? data.cliente.apiUrl : null
  } catch {
    return null
  }
}
