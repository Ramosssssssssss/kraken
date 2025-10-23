"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchJsonWithRetry } from "./fetch-with-retry";

interface CompanyData {
  id: number;
  codigo: string;
  nombre: string;
  apiUrl: string;
  branding?: {
    logo?: string;
    background?: string;
  };
}

interface UserData {
  id?: number;
  user: string;
  password: string;
  nombre?: string;
  email?: string;
  MODULOS_KRKN?: string | number[] | null;
  modulosKrknArr?: number[];
  [key: string]: any;
}

interface CompanyContextType {
  companyData: CompanyData | null;
  setCompanyData: (d: CompanyData | null) => void;
  userData: UserData | null;
  setUserData: (u: UserData | null) => void;
  apiUrl: string | null;
  isReady: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within a CompanyProvider");
  return ctx;
}

function safeGetLS(key: string) {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLS(key: string, value: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((r) => r.startsWith(name + "="))
    ?.split("=")[1];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyData, setCompanyDataState] = useState<CompanyData | null>(null);
  const [userData, setUserDataState] = useState<UserData | null>(null);
  const [isReady, setIsReady] = useState(false);

  const setCompanyData = (d: CompanyData | null) => {
    setCompanyDataState(d);
    safeSetLS("companyData", d ? JSON.stringify(d) : null);
  };

  const setUserData = (u: UserData | null) => {
    setUserDataState(u);
    safeSetLS("userData", u ? JSON.stringify(u) : null);
  };

  useEffect(() => {
    let done = false;
    (async () => {
      const userLS = safeGetLS("userData");
      if (userLS) {
        try {
          const parsedUser = JSON.parse(userLS) as UserData;
          if (parsedUser && parsedUser.user) {
            setUserDataState(parsedUser);
          }
        } catch {}
      }

      const ls = safeGetLS("companyData");
      if (ls) {
        try {
          const parsed = JSON.parse(ls) as CompanyData;
          if (parsed && parsed.apiUrl && parsed.codigo) {
            setCompanyDataState(parsed);
            done = true;
            
            // Recargar branding en segundo plano para tener la versión más reciente
            (async () => {
              try {
                const brandingData = await fetchJsonWithRetry(
                  `${parsed.apiUrl}/get-branding/${parsed.codigo}`
                );
                if (brandingData?.ok && brandingData?.branding) {
                  const updatedCompany = { ...parsed, branding: brandingData.branding };
                  setCompanyDataState(updatedCompany);
                  safeSetLS("companyData", JSON.stringify(updatedCompany));
                }
              } catch (error) {
                console.warn("⚠️ No se pudo actualizar el branding:", error);
              }
            })();
          }
        } catch {}
      }

      if (!done && typeof window !== "undefined") {
        const host = window.location.hostname;
        const parts = host.split(".");
        const sub = parts.length >= 3 ? (parts[0] || "").toLowerCase() : null;
        
        // Para desarrollo local (localhost), usar configuración por defecto
        const isLocalhost = host === "localhost" || host === "127.0.0.1";

        if ((sub && !["www", "app"].includes(sub)) || isLocalhost) {
          try {
            // Para localhost, usar empresa de prueba o variable de entorno
            const empresaToCheck = isLocalhost 
              ? (process.env.NEXT_PUBLIC_COMPANY_CODE || "demo")
              : sub;
            
            const data = await fetchJsonWithRetry(
              "https://picking-backend.onrender.com/check-cliente",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ empresa: empresaToCheck }),
              }
            );
            
            if (data?.ok && data?.cliente) {
              const c: CompanyData = { ...data.cliente };

              // Cargar branding si existe
              if (c.apiUrl && c.codigo) {
                try {
                  const brandingData = await fetchJsonWithRetry(
                    `${c.apiUrl}/get-branding/${c.codigo}`
                  );
                  if (brandingData?.ok && brandingData?.branding) {
                    c.branding = brandingData.branding;
                  }
                } catch (error) {
                  // Silenciar error de branding
                }
              }

              setCompanyDataState(c);
              safeSetLS("companyData", JSON.stringify(c));
              done = true;
            }
          } catch (error) {
            // Silenciar error de verificación
          }
        }
      }

      if (!done) {
        const codigo = readCookie("tenant");
        const apiUrl = readCookie("apiUrl");
        if (codigo && apiUrl) {
          const fallback: CompanyData = {
            id: 0,
            codigo,
            nombre: codigo,
            apiUrl,
          };
          
          // Intentar cargar branding para el fallback
          try {
            const brandingData = await fetchJsonWithRetry(
              `${apiUrl}/get-branding/${codigo}`
            );
            if (brandingData?.ok && brandingData?.branding) {
              fallback.branding = brandingData.branding;
            }
          } catch (error) {
            console.warn("⚠️ No se pudo cargar el branding para fallback:", error);
          }
          
          setCompanyDataState(fallback);
          safeSetLS("companyData", JSON.stringify(fallback));
        }
      }

      setIsReady(true);
    })();
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        companyData,
        setCompanyData,
        userData,
        setUserData,
        apiUrl: companyData?.apiUrl ?? null,
        isReady,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}
