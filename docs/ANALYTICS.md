# Analytics & Feedback — Technical Reference

## Overview

Only Sets collects **anonymous** usage analytics and provides an in-app
feedback mechanism. Both features are **opt-in**. No data is collected until
the user explicitly allows it.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_ANALYTICS_URL` | No | HTTP endpoint for analytics batch ingestion. If blank, analytics silently no-ops. |
| `EXPO_PUBLIC_FEEDBACK_URL` | No | HTTP endpoint for feedback submissions. If blank, feedback uses a dev mock and shows an error in production. |

Set these in a `.env.local` file (gitignored) for development, and in your CI
environment / EAS secrets for production builds.

---

## Analytics

### Consent

- The user is shown a disclosure modal on the first launch after this version ships.
- The setting is stored in `@gymtracker/settings` (`analyticsEnabled: true | false | undefined`).
- When `undefined`: modal is shown.
- When `false`: the analytics service is a strict no-op. No network requests are made. The event queue and installation ID are deleted immediately.
- When `true`: events are queued locally and sent in batches of up to 20.
- The user can change this at any time in **Settings → Anonymous usage analytics**.

### Installation ID

- A random UUID v4 is generated on first consent and stored in AsyncStorage at `@gymtracker/installationId`.
- Generated with `Math.random()` — not derived from hardware, advertising ID, or account data.
- **Deleted immediately** when consent is revoked. A new ID is generated if the user later re-enables analytics.
- Never transmitted when consent is off.

### Event Queue

- Stored in AsyncStorage at `@gymtracker/analyticsQueue`.
- Flushed 5 seconds after the last event, or immediately on `analytics.flush()`.
- Up to 20 events per batch request.
- Retried up to 3 times on server errors (5xx / network timeout). 4xx errors cause the batch to be dropped (bad client request).
- Queue is wiped immediately on consent revocation — unsent events are never held.

---

## Analytics Events

### `app_opened`
Fired once per app foreground.

| Property | Value |
|---|---|
| *(none)* | |

---

### `onboarding_started`
Fired when the user opens the app with no workout days configured.

---

### `onboarding_completed`
Fired when the user creates their first workout day.

---

### `program_created`
Fired when a new workout day is added to the program.

---

### `program_selected`
Fired when a workout session is started from a specific program day.

---

### `workout_started`

| Property | Type | Notes |
|---|---|---|
| `exercise_count` | number | Count of exercises in the day, no names |

---

### `workout_completed`

| Property | Type | Notes |
|---|---|---|
| `exercise_count` | number | |
| `set_count` | number | Total sets across all exercises |
| `workout_duration_bucket` | string | `<5min`, `5-15min`, `15-30min`, `30-60min`, `60-90min`, `>90min` |

---

### `workout_abandoned`
Fired when a draft workout is discarded.

---

### `set_logged`

| Property | Type | Notes |
|---|---|---|
| `set_count` | number | Total sets in the completed session |

---

### `exercise_added_to_workout`
Fired when a user adds an exercise mid-session. No exercise name attached.

---

### `progression_suggestion_shown`
Fired when the progressive overload suggestion banner renders for an exercise.

---

### `progression_suggestion_accepted`
Fired when a user accepts (applies) a progression suggestion.

---

### `statistics_viewed`
Fired when the Stats screen is opened.

---

### `muscle_heatmap_viewed`
Fired when the Body Map screen is opened.

---

### `exercise_history_viewed`
Fired when the Exercise History screen is opened.

---

### `feedback_opened`
Fired when the Send Feedback screen opens.

---

### `feedback_submitted`
Fired on successful feedback delivery.

---

### `feedback_failed`

| Property | Type |
|---|---|
| `error_code` | `NETWORK_ERROR` / `SERVER_ERROR` / `NO_ENDPOINT` / `RATE_LIMITED` |

---

### `error_recorded`
Fired via `analytics.recordError(code)`. Used for non-crash diagnostic events.

| Property | Type |
|---|---|
| `error_code` | string |

---

## Allowed vs. Prohibited Analytics Data

### Transmitted with events
- Anonymous installation UUID (only when consent is given)
- Android API version
- Event name
- Per-event properties as documented above (counts, buckets, error codes)

### **Never** transmitted
- Exercise names (built-in or custom)
- Workout or program names
- Exact weights lifted
- Exact repetition counts
- Body weight
- Workout notes
- User-entered text of any kind
- Email address or any contact information
- Device hardware identifiers
- Advertising ID (GAID)
- IP-derived location
- Device fingerprint

TypeScript's discriminated union event type enforces this at compile time —
it is structurally impossible to attach prohibited fields to an event payload.

---

## Backend API Contract — Analytics

### Endpoint
```
POST {EXPO_PUBLIC_ANALYTICS_URL}
Content-Type: application/json
```

### Request body
```json
{
  "installationId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "androidVersion": 34,
  "events": [
    {
      "id": "m6f2a-abc123",
      "name": "workout_completed",
      "properties": {
        "exercise_count": 4,
        "set_count": 16,
        "workout_duration_bucket": "30-60min"
      },
      "timestamp": "2026-01-01T10:00:00.000Z",
      "retryCount": 0
    }
  ]
}
```

### Expected responses
| Status | Meaning | Client behavior |
|---|---|---|
| 200–299 | Accepted | Remove batch from queue |
| 4xx | Bad request | Drop batch (do not retry) |
| 5xx | Server error | Retry (up to 3 times) |

---

## Backend API Contract — Feedback

### Endpoint
```
POST {EXPO_PUBLIC_FEEDBACK_URL}
Content-Type: application/json
```

### Request body
```json
{
  "type": "bug | feature_request | general",
  "message": "string (max 2000 characters)",
  "email": "optional string",
  "includeDiagnostics": true,
  "diagnostics": {
    "appVersion": "1.0.0",
    "buildNumber": "1",
    "androidVersion": "34",
    "timestamp": "2026-01-01T10:00:00.000Z",
    "installationId": "optional UUID — only present when analytics consent exists"
  }
}
```

`diagnostics` is omitted entirely when `includeDiagnostics` is false.
`installationId` is omitted from diagnostics when the user has not consented to analytics.

### Expected responses
| Status | Meaning |
|---|---|
| 200–299 | Accepted — show success state |
| 429 | Rate limited — show "try again later" |
| Other 4xx/5xx | Server error — show retry option |

---

## Google Play Data Safety Disclosures

When configuring the Play Store listing, the following disclosures will likely apply:

| Question | Answer |
|---|---|
| Does the app collect data? | **Yes** (when user consents) |
| Data types collected | App activity (feature usage, app interactions) |
| Data types **not** collected | Location, Personal info, Health & fitness workout content |
| Is collected data shared with third parties? | **No** (sent only to developer's own backend) |
| Is the data encrypted in transit? | **Yes** (HTTPS) |
| Can users request deletion? | **Yes** (revoking consent deletes the installation ID; the backend should honor deletion on request) |
| Is collection optional? | **Yes** — explicit opt-in with opt-out available at any time in Settings |

> These answers assume the analytics backend you build does not re-share data with
> third-party analytics vendors. Update if you add a vendor SDK.

---

## Backend Work Still Required

1. **Analytics ingestion endpoint** — accept the batch POST, store events, expose aggregate dashboards.
2. **Feedback submission endpoint** — receive the feedback POST, route to a support inbox or ticketing system.
3. **Data retention policy** — define how long raw events are kept; implement deletion endpoint for GDPR/CCPA.
4. **Backend privacy review** — ensure the server side also honors the prohibited-data list.
