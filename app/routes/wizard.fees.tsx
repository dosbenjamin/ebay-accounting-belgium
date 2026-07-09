import { Box, Button, Field, Grid, Heading, Input, Stack, Text } from '@chakra-ui/react';
import { Effect } from 'effect';
import { useActionData } from 'react-router';
import { ebayFeesErrorMessages } from '~/features/ebay-fees/messages';
import type { FeeInvoicePreview } from '~/features/ebay-fees/schemas';
import { previewFeeInvoice } from '~/features/ebay-fees/service';
import { LiveWorkerLayer } from '~/shared/effect/layers.server';
import { InputValidationError, readFormData, readFormObject } from '~/shared/effect/validation';
import type { ViewMessage } from '~/shared/errors/messages';
import { validationErrorMessages } from '~/shared/errors/validation';
import { MessageList } from '~/shared/ui/messages';
import { FeesActionForm } from './schemas';

export const loader = async () => ({ step: 'fees' });

type ActionData =
  | { readonly ok: true; readonly data: FeeInvoicePreview; readonly messages: readonly ViewMessage[] }
  | { readonly ok: false; readonly messages: readonly ViewMessage[] };

export const action = async ({ request }: { request: Request }): Promise<ActionData> => {
  const program = Effect.gen(function* () {
    const formData = yield* readFormData(request);
    const form = yield* readFormObject(formData, FeesActionForm);
    const csv = formData.get('feesCsv');
    if (!(csv instanceof File)) {
      return yield* Effect.fail(
        new InputValidationError({
          scope: 'form',
          message: 'CSV frais manquant.',
        }),
      );
    }
    const eurAmountColumn = form.eurAmountColumn?.trim() ?? '';
    const csvText = yield* Effect.promise(() => csv.text());
    return yield* previewFeeInvoice({
      invoiceId: 'facture-en-cours',
      month: 'mois',
      year: new Date().getFullYear(),
      originalPdfFileName: 'facture.pdf',
      csvText,
      csvFileName: csv.name,
      mapping: {
        currency: form.currencyColumn,
        amount: form.amountColumn,
        ...(eurAmountColumn ? { eurAmount: eurAmountColumn } : {}),
      },
      manualRates: form.usdRate ? [{ currency: 'USD', rateToEur: form.usdRate }] : [],
    });
  }).pipe(
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => ({
        ok: false as const,
        messages: cause._tag === 'InputValidationError' ? validationErrorMessages(cause) : ebayFeesErrorMessages(cause),
      }),
      onSuccess: (result) => ({
        ok: true as const,
        data: result.data,
        messages: result.messages,
      }),
    }),
  );

  return Effect.runPromise(program);
};

export default function FeesRoute() {
  const actionData = useActionData<typeof action>();
  return (
    <Stack gap='5'>
      <Box>
        <Heading size='lg'>Frais eBay</Heading>
        <Text color='gray.600'>Pour chaque facture, ajoutez le PDF officiel et le CSV de frais correspondant.</Text>
      </Box>
      <MessageList messages={actionData?.messages ?? []} />
      {actionData?.ok ? (
        <Box borderWidth='1px' borderColor='gray.200' borderRadius='md' p='4'>
          <Text color='gray.600' textStyle='sm'>
            Total facture
          </Text>
          <Text fontWeight='700'>{actionData.data.totalEur.toFixed(2)} EUR</Text>
        </Box>
      ) : null}
      <form method='post' encType='multipart/form-data'>
        <Stack gap='5'>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap='4'>
            <Field.Root>
              <Field.Label>PDF facture officielle</Field.Label>
              <Input name='invoicePdf' type='file' accept='application/pdf' />
            </Field.Root>
            <Field.Root>
              <Field.Label>CSV detail frais</Field.Label>
              <Input name='feesCsv' type='file' accept='.csv,text/csv' />
            </Field.Root>
            <Field.Root>
              <Field.Label>Colonne devise</Field.Label>
              <Input name='currencyColumn' placeholder='Devise' />
            </Field.Root>
            <Field.Root>
              <Field.Label>Colonne montant</Field.Label>
              <Input name='amountColumn' placeholder='Montant' />
            </Field.Root>
            <Field.Root>
              <Field.Label>Colonne montant EUR</Field.Label>
              <Input name='eurAmountColumn' placeholder='Optionnel' />
            </Field.Root>
            <Field.Root>
              <Field.Label>Taux manuel USD vers EUR</Field.Label>
              <Input name='usdRate' type='number' step='0.0001' placeholder='Optionnel' />
            </Field.Root>
          </Grid>
          <Button type='submit' colorPalette='brand' alignSelf='flex-start'>
            Calculer les frais
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
