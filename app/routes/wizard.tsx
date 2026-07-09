import { Badge, Box, Container, Flex, Stack, Tabs, Text } from '@chakra-ui/react';
import { Outlet, useLocation, useNavigate } from 'react-router';

const steps = [
  { href: '/', label: 'Parametres' },
  { href: '/sales', label: 'Ventes' },
  { href: '/refunds', label: 'Remboursements' },
  { href: '/fees', label: 'Frais eBay' },
  { href: '/review', label: 'Verification' },
  { href: '/generate', label: 'Generation' },
];

export default function WizardLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Container maxW='7xl' py={{ base: '4', md: '8' }}>
      <Stack gap='6'>
        <Flex justify='space-between' align={{ base: 'start', md: 'center' }} gap='4'>
          <Box>
            <Text textStyle='sm' color='gray.600'>
              Comptabilite eBay Belgique
            </Text>
            <Text textStyle='2xl' fontWeight='700'>
              Dossier trimestriel
            </Text>
          </Box>
          <Badge colorPalette='brand'>MVP Worker</Badge>
        </Flex>
        <Tabs.Root
          value={location.pathname}
          colorPalette='brand'
          variant='subtle'
          onValueChange={({ value }) => {
            if (value !== location.pathname) navigate(value);
          }}
        >
          <Tabs.List overflowX='auto'>
            {steps.map((step) => (
              <Tabs.Trigger key={step.href} value={step.href} whiteSpace='nowrap'>
                {step.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
        <Box bg='white' borderWidth='1px' borderColor='gray.200' borderRadius='lg' p='6'>
          <Outlet />
        </Box>
      </Stack>
    </Container>
  );
}
