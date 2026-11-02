/**
 * Reset único da plataforma (zero clientes / zero memória).
 * Roda uma vez por navegador quando PLATFORM_RESET_VERSION muda.
 * Mantém apenas configurações operacionais (ex.: Mercado Pago).
 * Para zerar de novo no futuro, basta incrementar a versão.
 */
export const PLATFORM_RESET_VERSION = 'mourato_platform_reset_v5';

const KEEP_KEYS = new Set([
  'mourato_mercadopago_config_v1',
  PLATFORM_RESET_VERSION,
]);

export const runPlatformResetOnce = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(PLATFORM_RESET_VERSION) === 'done') return;

    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().startsWith('mourato_') && !KEEP_KEYS.has(key)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));

    try { sessionStorage.clear(); } catch (_) {}

    localStorage.setItem('mourato_platform_cleaned_v5', 'true');
    localStorage.setItem(PLATFORM_RESET_VERSION, 'done');
  } catch (e) {
    console.warn('Falha no reset da plataforma:', e);
  }
};
