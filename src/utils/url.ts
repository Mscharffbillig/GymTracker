export function requireSecureEndpoint(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type AnalyticsEndpointResult =
  | { configured: true; url: string }
  | { configured: false; reason: 'missing' | 'invalid' | 'insecure' };

/**
 * Resolves the analytics endpoint from an env-var value.
 * Returns a typed result so callers can distinguish between
 * "not configured" (hold events locally) and "configured + valid"
 * (ready to transmit). Never logs or reports the raw URL.
 */
export function resolveAnalyticsEndpoint(value: string | undefined): AnalyticsEndpointResult {
  if (!value || value.trim() === '') {
    return { configured: false, reason: 'missing' };
  }
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') {
      return { configured: false, reason: 'insecure' };
    }
    return { configured: true, url: url.toString() };
  } catch {
    return { configured: false, reason: 'invalid' };
  }
}
