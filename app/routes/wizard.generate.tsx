import { Button, Heading, List, Stack, Text } from '@chakra-ui/react';

export const loader = async () => ({
  manifest: [
    'ventes_<annee>_<trimestre>.pdf',
    'remboursements_<annee>_<trimestre>.pdf',
    'factures frais eBay avec annexe EUR',
    'synthese_frais_<annee>_<trimestre>.pdf',
    'controle_<annee>_<trimestre>.csv',
  ],
});

export default function GenerateRoute() {
  return (
    <Stack gap='4'>
      <Heading size='lg'>Generation</Heading>
      <Text color='gray.600'>La generation finale est executee cote Worker et produit un ZIP comptable.</Text>
      <List.Root>
        <List.Item>PDF ventes trimestrielles</List.Item>
        <List.Item>PDF remboursements trimestriels</List.Item>
        <List.Item>PDF frais separes, chacun avec annexe EUR</List.Item>
        <List.Item>CSV de controle</List.Item>
      </List.Root>
      <Button colorPalette='brand' alignSelf='flex-start'>
        Generer le ZIP
      </Button>
    </Stack>
  );
}
