type ApiError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
      code?: string;
    };
  };
  message?: string;
};

const CODE_MESSAGES: Record<string, string> = {
  use_pai_login: 'Please sign in with PersonalAI.',
  pai_required: 'Please sign in with PersonalAI to continue.',
  jobpost_profile_required: 'Choose a role to finish creating your JobPost profile.',
  email_not_verified: 'Please verify your email before signing in.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Please check the details and try again.',
  401: 'Please sign in again to continue.',
  403: 'Your session expired. Please refresh and try again.',
  404: 'We could not find what you were looking for.',
  409: 'That already exists or is in use.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const UNFRIENDLY_MESSAGES = new Set([
  'code verification failed',
  'external auth failed',
  'forgot password failed',
  'pai_api_base is not configured',
  'pai login failed',
  'pai resend failed',
  'pai response missing user',
  'pai signup failed',
  'pai user missing email',
  'pai verification failed',
  'pai verify failed',
  'password reset failed',
]);

const TECHNICAL_PATTERN =
  /(mongo|e11000|cast to objectid|validationerror|stack|error:|syntaxerror|referenceerror|typeerror)/i;

function isFriendlyMessage(message: string) {
  if (!message) return false;
  if (UNFRIENDLY_MESSAGES.has(message.trim().toLowerCase())) return false;
  if (message.length > 180) return false;
  if (TECHNICAL_PATTERN.test(message)) return false;
  return true;
}

export function friendlyError(
  err: ApiError | any,
  fallback = 'Something went wrong. Please try again.'
) {
  const code = err?.response?.data?.code;
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const status = err?.response?.status;
  const rawMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
  const message = typeof rawMessage === 'string' ? rawMessage : '';

  if (message) {
    const normalized = message.toLowerCase();
    if (normalized.includes('invalid credentials')) {
      return 'Email or password is incorrect.';
    }
    if (normalized.includes('not found')) {
      return 'We could not find what you were looking for.';
    }
    if (normalized.includes('strong password')) {
      return 'Use at least 8 characters with uppercase, lowercase, and a number.';
    }
    if (normalized.includes('reset token')) {
      return 'That reset link is invalid or expired. Request a new code and try again.';
    }
    if (normalized.includes('network error') || normalized.includes('failed to fetch')) {
      return 'We could not reach the server. Please try again.';
    }
    if (normalized.includes('csrf') || normalized.includes('forbidden')) {
      return 'Your session expired. Please refresh and try again.';
    }
    if (isFriendlyMessage(message)) {
      return message;
    }
  }

  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  return fallback;
}
