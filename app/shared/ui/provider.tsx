import { ChakraProvider } from '@chakra-ui/react';
import { system } from './theme';

export function Provider({ children }: { readonly children: React.ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
