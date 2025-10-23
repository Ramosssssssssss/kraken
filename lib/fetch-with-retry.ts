// lib/fetch-with-retry.ts

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      // Si es 404 o error de cliente (4xx), NO reintentar
      if (!response.ok && response.status >= 400 && response.status < 500) {
        console.warn(
          `⚠️ Error ${response.status} en ${url} - No se reintentará`
        );
        return response; // Devolver la respuesta para que se maneje en fetchJsonWithRetry
      }

      // Si es error de servidor (5xx), reintenta
      if (!response.ok && response.status >= 500) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      return response;
    } catch (error) {
      const isLastAttempt = i === retries - 1;

      if (!isLastAttempt) {
        console.warn(
          `⚠️ Intento ${
            i + 1
          }/${retries} fallido. Reintentando en ${RETRY_DELAY_MS}ms...`,
          error
        );
        await delay(RETRY_DELAY_MS);
      } else {
        console.error(
          `❌ Todos los intentos fallaron después de ${retries} reintentos`
        );
        throw error;
      }
    }
  }

  throw new Error(
    "No se pudo completar la solicitud después de varios intentos."
  );
};

/**
 * Wrapper para fetch con reintentos y manejo de JSON
 */
export const fetchJsonWithRetry = async <T = any>(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> => {
  const response = await fetchWithRetry(url, options, retries);

  // Si la respuesta no es OK (404, 500, etc.), lanzar error antes de parsear
  if (!response.ok) {
    const text = await response.text();
    console.error(
      `❌ Error HTTP ${response.status} en ${url}:`,
      text.substring(0, 200)
    );
    throw new Error(
      `Error HTTP ${response.status}: ${
        response.statusText || "Error en la petición"
      }`
    );
  }

  // Primero obtenemos el texto para poder usarlo en caso de error
  const text = await response.text();

  // Verificar si la respuesta está vacía
  if (!text || text.trim().length === 0) {
    console.warn(`⚠️ Respuesta vacía de ${url}`);
    return {} as T;
  }

  // Intenta parsear JSON
  try {
    const json = JSON.parse(text);
    return json;
  } catch (parseError) {
    console.error(
      "❌ Error parseando JSON. Respuesta recibida:",
      text.substring(0, 200)
    );
    throw new Error(
      `Respuesta inválida del servidor (no es JSON válido). Status: ${response.status}`
    );
  }
};
