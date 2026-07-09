import { Button, Heading, List, Stack, Text } from '@chakra-ui/react';

export const loader = async () => ({
  manifest: [
    'ventes_<annee>_<trimestre>.pdf',
    'factures frais eBay avec annexe EUR',
    'synthese_frais_<annee>_<trimestre>.pdf',
    'controle_<annee>_<trimestre>.csv',
  ],
});

export default function GenerateRoute() {
  return (
    <Stack gap='4'>
      <Heading size='lg'>Génération</Heading>
      <Text color='gray.600'>La génération finale est exécutée côté Worker et produit un ZIP comptable.</Text>
      <List.Root>
        <List.Item>PDF ventes et remboursements trimestriels</List.Item>
        <List.Item>PDF frais séparés, chacun avec annexe EUR</List.Item>
        <List.Item>CSV de contrôle</List.Item>
      </List.Root>
      <Button colorPalette='brand' alignSelf='flex-start'>
        Générer le ZIP
      </Button>
    </Stack>
  );
}
