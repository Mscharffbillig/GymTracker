import { FeedbackError, FeedbackRequest, IFeedbackService } from './FeedbackService';

// Used when EXPO_PUBLIC_FEEDBACK_URL is not set.
// In __DEV__ mode: logs and resolves. In production without a URL: throws to surface the misconfiguration.
export class MockFeedbackService implements IFeedbackService {
  async submit(request: FeedbackRequest): Promise<void> {
    if (!__DEV__) {
      throw new FeedbackError('NO_ENDPOINT', 'Feedback endpoint not configured.');
    }
    await new Promise((r) => setTimeout(r, 800)); // simulate latency
    console.log('[MockFeedbackService] Feedback submitted:', JSON.stringify(request, null, 2));
  }
}
