interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * Error display with retry/dismiss. Stub for Task 1 typecheck.
 * Full implementation in Task 2.
 */
export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  return null;
}
