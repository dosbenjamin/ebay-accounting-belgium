import { Badge, Box, Container, Flex, Stack, Text } from "@chakra-ui/react";
import { Outlet } from "react-router";

export default function WizardLayout() {
  return (
    <Container maxW="7xl" py={{ base: "4", md: "8" }}>
      <Stack gap="6">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap="4">
          <Box>
            <Text textStyle="2xl" fontWeight="700">
              Comptabilité eBay
            </Text>
          </Box>
          <Badge colorPalette="brand">MVP Worker</Badge>
        </Flex>
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="lg" p="6">
          <Outlet />
        </Box>
      </Stack>
    </Container>
  );
}
