import { HttpFeedbackService } from '../services/HttpFeedbackService';
import { MockFeedbackService } from '../services/MockFeedbackService';
import { FeedbackError, FeedbackRequest } from '../services/FeedbackService';

const BASE_REQUEST: FeedbackRequest = {
  type: 'general',
  message: 'Test message',
  includeDiagnostics: false,
};

const DIAGNOSTICS_REQUEST: FeedbackRequest = {
  ...BASE_REQUEST,
  includeDiagnostics: true,
  diagnostics: {
    appVersion: '1.0.0',
    buildNumber: '1',
    androidVersion: '34',
    timestamp: '2026-01-01T00:00:00.000Z',
  },
};

beforeEach(() => {
  (global.fetch as jest.Mock).mockReset();
});

// ── HttpFeedbackService ────────────────────────────────────────────────────

describe('HttpFeedbackService', () => {
  const service = new HttpFeedbackService('https://example.com/feedback');

  test('successful submission resolves without error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await expect(service.submit(BASE_REQUEST)).resolves.toBeUndefined();
  });

  test('sends correct Content-Type header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await service.submit(BASE_REQUEST);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('serializes type and message in request body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await service.submit(BASE_REQUEST);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.type).toBe('general');
    expect(body.message).toBe('Test message');
  });

  test('includes email when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await service.submit({ ...BASE_REQUEST, email: 'user@example.com' });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.email).toBe('user@example.com');
  });

  test('omits email field when not provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await service.submit(BASE_REQUEST);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect('email' in body).toBe(false);
  });

  test('includes diagnostics when includeDiagnostics is true', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await service.submit(DIAGNOSTICS_REQUEST);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.diagnostics).toBeDefined();
    expect(body.diagnostics.appVersion).toBe('1.0.0');
  });

  test('omits diagnostics object when includeDiagnostics is false', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await service.submit(BASE_REQUEST);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.diagnostics).toBeUndefined();
  });

  test('omits installation ID from diagnostics when not in request', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await service.submit(DIAGNOSTICS_REQUEST); // no installationId in diagnostics
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.diagnostics?.installationId).toBeUndefined();
  });

  test('includes installation ID in diagnostics when analytics consent exists', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    const req: FeedbackRequest = {
      ...DIAGNOSTICS_REQUEST,
      diagnostics: { ...DIAGNOSTICS_REQUEST.diagnostics!, installationId: 'test-uuid-1234' },
    };
    await service.submit(req);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.diagnostics.installationId).toBe('test-uuid-1234');
  });

  test('throws FeedbackError with NETWORK_ERROR on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network unreachable'));
    await expect(service.submit(BASE_REQUEST)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  test('throws FeedbackError with SERVER_ERROR on 5xx response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(service.submit(BASE_REQUEST)).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    });
  });

  test('throws FeedbackError with RATE_LIMITED on 429 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(service.submit(BASE_REQUEST)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });
});

// ── MockFeedbackService ────────────────────────────────────────────────────

describe('MockFeedbackService', () => {
  const service = new MockFeedbackService();

  test('resolves successfully in __DEV__ mode', async () => {
    await expect(service.submit(BASE_REQUEST)).resolves.toBeUndefined();
  });

  test('throws FeedbackError with NO_ENDPOINT in production without a URL', async () => {
    const origDev = global.__DEV__;
    global.__DEV__ = false;
    await expect(service.submit(BASE_REQUEST)).rejects.toMatchObject({
      code: 'NO_ENDPOINT',
    });
    global.__DEV__ = origDev;
  });
});

// ── Validation logic (unit-level, matches FeedbackScreen validate()) ───────

describe('Feedback message validation', () => {
  function validate(message: string, email: string): { messageError: string | null; emailError: string | null } {
    const MAX = 2000;
    let messageError: string | null = null;
    let emailError: string | null = null;

    if (!message.trim()) {
      messageError = 'Message is required.';
    } else if (message.length > MAX) {
      messageError = `Message must be ${MAX} characters or fewer.`;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      emailError = 'Enter a valid email address, or leave it blank.';
    }

    return { messageError, emailError };
  }

  test('empty message fails validation', () => {
    const { messageError } = validate('', '');
    expect(messageError).not.toBeNull();
  });

  test('message over 2000 chars fails validation', () => {
    const { messageError } = validate('a'.repeat(2001), '');
    expect(messageError).not.toBeNull();
  });

  test('valid message passes', () => {
    const { messageError } = validate('This is fine', '');
    expect(messageError).toBeNull();
  });

  test('malformed email fails validation', () => {
    const { emailError } = validate('msg', 'notanemail');
    expect(emailError).not.toBeNull();
  });

  test('valid email passes', () => {
    const { emailError } = validate('msg', 'user@example.com');
    expect(emailError).toBeNull();
  });

  test('empty email passes (it is optional)', () => {
    const { emailError } = validate('msg', '');
    expect(emailError).toBeNull();
  });
});
