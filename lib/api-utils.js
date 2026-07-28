export async function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`Timeout after ${timeout}ms: ${url}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
