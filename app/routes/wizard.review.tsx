import { Heading, List, Stack, Text } from '@chakra-ui/react';

export const loader = async () => ({
  checks: [
    'Synthèse ventes par pays/UE-hors UE',
    'Synthèse remboursements par pays/UE-hors UE',
    'Synthèse frais par facture et devise',
    'Validation des taux utilisés',
  ],
});

export default function ReviewRoute() {
  return (
    <Stack gap='4'>
      <Heading size='lg'>Vérification</Heading>
      <Text color='gray.600'>Cette étape affichera les synthèses calculées par le Worker avant génération.</Text>
      <List.Root>
        <List.Item>Synthèse ventes</List.Item>
        <List.Item>Synthèse remboursements</List.Item>
        <List.Item>Total frais EUR par facture et global</List.Item>
        <List.Item>Warnings acceptables avant génération</List.Item>
      </List.Root>
    </Stack>
  );
}
