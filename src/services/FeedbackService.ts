export type FeedbackType = 'bug' | 'feature_request' | 'general';

export interface FeedbackDiagnostics {
  appVersion: string;
  buildNumber: string;
  androidVersion: string;
  timestamp: string;
  installationId?: string; // only included when analytics consent exists
}

export interface FeedbackRequest {
  type: FeedbackType;
  message: string;        // user-provided; max 2000 chars
  email?: string;         // optional; only used to follow up with the user
  includeDiagnostics: boolean;
  diagnostics?: FeedbackDiagnostics;
}

export type FeedbackErrorCode =
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'NO_ENDPOINT'
  | 'RATE_LIMITED';

export class FeedbackError extends Error {
  constructor(
    public readonly code: FeedbackErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'FeedbackError';
  }
}

export interface IFeedbackService {
  submit(request: FeedbackRequest): Promise<void>;
}
