import { Heading, List, Stack, Text } from '@chakra-ui/react';

export const loader = async () => ({
  checks: [
    'Synthese ventes par pays/UE-hors UE',
    'Synthese remboursements par pays/UE-hors UE',
    'Synthese frais par facture et devise',
    'Validation des taux utilises',
  ],
});

export default function ReviewRoute() {
  return (
    <Stack gap='4'>
      <Heading size='lg'>Verification</Heading>
      <Text color='gray.600'>Cette etape affichera les syntheses calculees par le Worker avant generation.</Text>
      <List.Root>
        <List.Item>Synthese ventes</List.Item>
        <List.Item>Synthese remboursements</List.Item>
        <List.Item>Total frais EUR par facture et global</List.Item>
        <List.Item>Warnings acceptables avant generation</List.Item>
      </List.Root>
    </Stack>
  );
}
