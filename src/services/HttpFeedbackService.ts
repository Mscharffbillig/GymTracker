import { FeedbackError, FeedbackRequest, IFeedbackService } from './FeedbackService';

const REQUEST_TIMEOUT_MS = 15_000;

export class HttpFeedbackService implements IFeedbackService {
  constructor(private readonly endpoint: string) {}

  async submit(request: FeedbackRequest): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const body: Record<string, unknown> = {
        type: request.type,
        message: request.message,
        includeDiagnostics: request.includeDiagnostics,
      };
      if (request.email) body.email = request.email;
      if (request.includeDiagnostics && request.diagnostics) {
        body.diagnostics = request.diagnostics;
      }

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        throw new FeedbackError('RATE_LIMITED', 'Too many requests. Please try again later.');
      }
      if (!res.ok) {
        throw new FeedbackError('SERVER_ERROR', `Server returned ${res.status}`);
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof FeedbackError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort') || msg.includes('timeout')) {
        throw new FeedbackError('NETWORK_ERROR', 'Request timed out. Check your connection.');
      }
      throw new FeedbackError('NETWORK_ERROR', 'Could not reach the server. Check your connection.');
    }
  }
}
