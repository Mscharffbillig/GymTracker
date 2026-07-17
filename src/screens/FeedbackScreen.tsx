import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { SettingsStackParamList } from '../navigation/types';
import { FeedbackType, FeedbackError, IFeedbackService } from '../services/FeedbackService';
import { HttpFeedbackService } from '../services/HttpFeedbackService';
import { MockFeedbackService } from '../services/MockFeedbackService';
import { getInstallationId } from '../analytics/installation';
import { trackFeedbackOpened, trackFeedbackSubmitted, trackFeedbackFailed } from '../analytics/events';

const MAX_MESSAGE_LENGTH = 2000;
const SUBMIT_COOLDOWN_MS = 30_000;

const FEEDBACK_URL = (process.env.EXPO_PUBLIC_FEEDBACK_URL ?? '').trim();
const FEEDBACK_UNAVAILABLE = !FEEDBACK_URL && !__DEV__;
const feedbackService: IFeedbackService = FEEDBACK_URL
  ? new HttpFeedbackService(FEEDBACK_URL)
  : new MockFeedbackService();

function getAppVersion(): string {
  try {
    // expo-constants is a transitive dep of expo — available without explicit package.json entry
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default;
    return (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function getBuildNumber(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default;
    return String((Constants.expoConfig?.android?.versionCode as number | undefined) ?? 1);
  } catch {
    return '1';
  }
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

const FEEDBACK_TYPES: Array<{ value: FeedbackType; label: string }> = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'general', label: 'General' },
];

type Props = NativeStackScreenProps<SettingsStackParamList, 'Feedback'>;

export function FeedbackScreen({ navigation }: Props) {
  const { settings, colors } = useAppData();
  const styles = createStyles(colors);

  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const lastSubmitRef = useRef<number>(0);

  React.useEffect(() => {
    trackFeedbackOpened();
  }, []);

  function validate(): boolean {
    let ok = true;
    if (!message.trim()) {
      setMessageError('Message is required.');
      ok = false;
    } else if (message.length > MAX_MESSAGE_LENGTH) {
      setMessageError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      ok = false;
    } else {
      setMessageError(null);
    }

    if (email.trim() && !isValidEmail(email)) {
      setEmailError('Enter a valid email address, or leave it blank.');
      ok = false;
    } else {
      setEmailError(null);
    }
    return ok;
  }

  async function handleSubmit() {
    if (!validate()) return;

    if (Date.now() - lastSubmitRef.current < SUBMIT_COOLDOWN_MS) {
      Alert.alert('Please wait', 'Wait a moment before submitting again.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Installation ID is only included when the user has consented to analytics
      let resolvedInstallId: string | undefined;
      if (settings.analyticsEnabled === 'allowed') {
        try { resolvedInstallId = await getInstallationId(); } catch { /* ignore */ }
      }

      await feedbackService.submit({
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        includeDiagnostics,
        diagnostics: includeDiagnostics
          ? {
              appVersion: getAppVersion(),
              buildNumber: getBuildNumber(),
              androidVersion: String(Platform.Version),
              timestamp: new Date().toISOString(),
              installationId: resolvedInstallId,
            }
          : undefined,
      });

      lastSubmitRef.current = Date.now();
      setSuccess(true);
      trackFeedbackSubmitted();
    } catch (err) {
      const code = err instanceof FeedbackError ? err.code : 'NETWORK_ERROR';
      const msg =
        err instanceof FeedbackError
          ? err.message
          : 'Something went wrong. Please try again.';
      setErrorMessage(msg);
      trackFeedbackFailed(code);
    } finally {
      setSubmitting(false);
    }
  }

  if (FEEDBACK_UNAVAILABLE) {
    return (
      <ScreenContainer style={styles.container} edges={['bottom']}>
        <View style={styles.successContainer}>
          <Ionicons name="construct-outline" size={64} color={colors.textMuted} />
          <Text style={[fontStyles.heading, styles.successTitle, { color: colors.text }]}>
            Feedback temporarily unavailable
          </Text>
          <Text style={[fontStyles.body, styles.successBody, { color: colors.textMuted }]}>
            The feedback endpoint has not been set up yet. Check back in a future update.
          </Text>
          <Pressable
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.submitBtnLabel}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  if (success) {
    return (
      <ScreenContainer style={styles.container} edges={['bottom']}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={[fontStyles.heading, styles.successTitle, { color: colors.text }]}>
            Thanks for your feedback!
          </Text>
          <Text style={[fontStyles.body, styles.successBody, { color: colors.textMuted }]}>
            {email.trim()
              ? "We'll reach out at the address you provided if we need to follow up."
              : 'Your report helps make Only Sets better.'}
          </Text>
          <Pressable
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.submitBtnLabel}>Done</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[fontStyles.title, styles.title, { color: colors.text }]}>
            Send Feedback
          </Text>

          <Text style={[fontStyles.label, styles.label, { color: colors.textMuted }]}>
            FEEDBACK TYPE
          </Text>
          <View style={styles.chipRow}>
            {FEEDBACK_TYPES.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setType(value)}
                style={[
                  styles.chip,
                  type === value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: type === value }}
                accessibilityLabel={label}
              >
                <Text
                  style={[styles.chipLabel, { color: type === value ? '#fff' : colors.textMuted }]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[fontStyles.label, styles.label, { color: colors.textMuted }]}>
            MESSAGE <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                color: colors.text,
                borderColor: messageError ? colors.danger : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={message}
            onChangeText={(v) => {
              setMessage(v);
              if (messageError) setMessageError(null);
            }}
            placeholder="Describe the issue, request, or feedback…"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Feedback message"
          />
          <View style={styles.messageFooter}>
            {messageError ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>{messageError}</Text>
            ) : (
              <View />
            )}
            <Text
              style={[
                styles.charCount,
                { color: message.length > MAX_MESSAGE_LENGTH ? colors.danger : colors.textMuted },
              ]}
            >
              {message.length}/{MAX_MESSAGE_LENGTH}
            </Text>
          </View>

          <Text style={[fontStyles.label, styles.label, { color: colors.textMuted }]}>
            FOLLOW-UP EMAIL (OPTIONAL)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: emailError ? colors.danger : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailError) setEmailError(null);
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Follow-up email address"
          />
          {emailError ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{emailError}</Text>
          ) : (
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              Only used to respond to your submission. Never shared.
            </Text>
          )}

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setIncludeDiagnostics((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: includeDiagnostics }}
            accessibilityLabel="Include technical diagnostics"
          >
            <Ionicons
              name={includeDiagnostics ? 'checkbox' : 'square-outline'}
              size={22}
              color={includeDiagnostics ? colors.primary : colors.textMuted}
            />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[fontStyles.body, { color: colors.text }]}>
                Include technical diagnostics
              </Text>
              <Text style={[fontStyles.bodyMuted, { color: colors.textMuted, marginTop: 2 }]}>
                App version, Android version, device model, and a timestamp.
                {settings.analyticsEnabled === 'allowed'
                  ? ' Your anonymous installation ID will also be included.'
                  : ''}
                {' '}Workout history is never included.
              </Text>
            </View>
          </Pressable>

          {errorMessage && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: colors.surface, borderColor: colors.danger },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={[styles.errorBannerText, { color: colors.danger }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: submitting ? colors.primaryMuted : colors.primary },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={errorMessage ? 'Try again' : 'Submit feedback'}
            accessibilityState={{ disabled: submitting }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnLabel}>{errorMessage ? 'Try Again' : 'Submit'}</Text>
            )}
          </Pressable>

          <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
            Your message is transmitted to our support team. No workout data is ever attached.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl * 2,
    },
    title: { marginBottom: spacing.lg },
    label: { marginTop: spacing.lg, marginBottom: spacing.sm },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipLabel: { fontSize: 13, fontWeight: '600' },
    textArea: {
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
      minHeight: 140,
    },
    messageFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    charCount: { fontSize: 12 },
    input: {
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 15,
    },
    helperText: { marginTop: spacing.xs, fontSize: 12, lineHeight: 18 },
    errorText: { marginTop: spacing.xs, fontSize: 12 },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: spacing.xl,
      paddingVertical: spacing.xs,
      minHeight: 44,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    errorBannerText: { flex: 1, fontSize: 14 },
    submitBtn: {
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      minHeight: 50,
      justifyContent: 'center',
    },
    submitBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    privacyNote: { marginTop: spacing.md, fontSize: 12, textAlign: 'center', lineHeight: 18 },
    successContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    successTitle: { marginTop: spacing.lg, textAlign: 'center' },
    successBody: { marginTop: spacing.md, textAlign: 'center', lineHeight: 22 },
  });
}
