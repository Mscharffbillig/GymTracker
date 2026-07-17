// Module-level flag: Sentry events are gated on this before being transmitted.
// Set via setDiagnosticsConsent() from AppDataContext when settings load or change.
let _consented = false;

export function setDiagnosticsConsent(allowed: boolean): void {
  _consented = allowed;
}

export function isDiagnosticsConsented(): boolean {
  return _consented;
}
