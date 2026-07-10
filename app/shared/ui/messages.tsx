import { Alert, Stack } from '@chakra-ui/react';
import type { ViewMessage } from '~/shared/errors/messages';

const alertStatusBySeverity = {
  error: 'error',
  warning: 'warning',
  success: 'success',
  info: 'info',
} as const satisfies Record<ViewMessage['severity'], 'error' | 'warning' | 'success' | 'info'>;

const statusFor = (severity: ViewMessage['severity']) => alertStatusBySeverity[severity];

export function MessageList({ messages }: { readonly messages: readonly ViewMessage[] }) {
  if (messages.length === 0) return null;

  return (
    <Stack gap="2">
      {messages.map((message) => (
        <Alert.Root key={`${message.id}:${message.text}`} status={statusFor(message.severity)}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message.text}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ))}
    </Stack>
  );
}
