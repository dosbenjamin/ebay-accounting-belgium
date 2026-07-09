import { Button, Field, Grid, Heading, Input, Select, Stack, createListCollection } from '@chakra-ui/react';
import { Effect } from 'effect';
import { redirect, useActionData } from 'react-router';
import { setupSaved } from '~/features/dossier-setup/messages';
import { readFormData, readFormObject } from '~/shared/effect/validation';
import { validationErrorMessages } from '~/shared/errors/validation';
import { MessageList } from '~/shared/ui/messages';
import { WizardSetupActionForm } from './schemas';

const quarterCollection = createListCollection({
  items: [
    { label: 'T1', value: 'T1' },
    { label: 'T2', value: 'T2' },
    { label: 'T3', value: 'T3' },
    { label: 'T4', value: 'T4' },
  ],
});

export const loader = async () => ({ step: 'setup' });

export const action = async ({ request }: { request: Request }) => {
  const program = readFormData(request).pipe(
    Effect.flatMap((formData) => readFormObject(formData, WizardSetupActionForm)),
    Effect.match({
      onFailure: (cause) => ({
        ok: false as const,
        messages: validationErrorMessages(cause),
      }),
      onSuccess: () => redirect('/sales', { headers: { 'x-action': 'setup' } }),
    }),
  );

  return Effect.runPromise(program);
};

export default function SetupRoute() {
  const actionData = useActionData<typeof action>();
  return (
    <Stack gap='5'>
      <Heading size='lg'>Paramètres</Heading>
      <MessageList
        messages={actionData && 'messages' in actionData ? actionData.messages : actionData ? setupSaved() : []}
      />
      <form method='post' action='?index'>
        <Stack gap='5'>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap='4'>
            <Field.Root>
              <Field.Label>Année</Field.Label>
              <Input name='year' type='number' defaultValue={new Date().getFullYear()} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Trimestre</Field.Label>
              <Select.Root name='quarter' collection={quarterCollection} defaultValue={['T1']}>
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder='Sélectionner un trimestre' />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {quarterCollection.items.map((quarter) => (
                      <Select.Item item={quarter} key={quarter.value}>
                        <Select.ItemText>{quarter.label}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Devise comptable</Field.Label>
              <Input name='accountingCurrency' value='EUR' readOnly />
            </Field.Root>
          </Grid>
          <Button type='submit' colorPalette='brand' alignSelf='flex-start'>
            Continuer
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
