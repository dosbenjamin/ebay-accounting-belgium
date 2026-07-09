import { Alert, Stack } from '@chakra-ui/react';
import type { ViewMessage } from '~/shared/errors/messages';

const statusFor = (severity: ViewMessage['severity']) =>
  severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : severity === 'success' ? 'success' : 'info';

export function MessageList({ messages }: { readonly messages: readonly ViewMessage[] }) {
  if (messages.length === 0) return null;

  return (
    <Stack gap='2'>
      {messages.map((message, index) => (
        <Alert.Root key={`${message.id}:${index}`} status={statusFor(message.severity)}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message.text}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ))}
    </Stack>
  );
}
