import { Box, Button, Field, FileUpload, Grid, Heading, Stack, Text } from '@chakra-ui/react';
import { MessageList } from '~/shared/ui/messages';
import type { ViewMessage } from '~/shared/errors/messages';

type Props = {
  readonly title: string;
  readonly description: string;
  readonly action: string;
  readonly messages?: readonly ViewMessage[] | undefined;
  readonly summary?:
    | {
        readonly totalRows: number;
        readonly totalEur: number;
        readonly euTotal: number;
        readonly nonEuTotal: number;
      }
    | undefined;
};

export function DocumentUploadPanel({ title, description, action, messages = [], summary }: Props) {
  return (
    <Box>
      <Stack gap='5'>
        <Box>
          <Heading size='lg'>{title}</Heading>
          <Text color='gray.600'>{description}</Text>
        </Box>
        <MessageList messages={messages} />
        {summary ? (
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap='3'>
            <Box borderWidth='1px' borderColor='gray.200' borderRadius='md' p='3'>
              <Text color='gray.600' textStyle='sm'>
                Lignes
              </Text>
              <Text fontWeight='700'>{summary.totalRows}</Text>
            </Box>
            <Box borderWidth='1px' borderColor='gray.200' borderRadius='md' p='3'>
              <Text color='gray.600' textStyle='sm'>
                Total EUR
              </Text>
              <Text fontWeight='700'>{summary.totalEur.toFixed(2)}</Text>
            </Box>
            <Box borderWidth='1px' borderColor='gray.200' borderRadius='md' p='3'>
              <Text color='gray.600' textStyle='sm'>
                UE
              </Text>
              <Text fontWeight='700'>{summary.euTotal.toFixed(2)}</Text>
            </Box>
            <Box borderWidth='1px' borderColor='gray.200' borderRadius='md' p='3'>
              <Text color='gray.600' textStyle='sm'>
                Hors UE
              </Text>
              <Text fontWeight='700'>{summary.nonEuTotal.toFixed(2)}</Text>
            </Box>
          </Grid>
        ) : null}
        <form method='post' action={action} encType='multipart/form-data'>
          <Stack gap='5'>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap='4'>
              <Field.Root>
                <Field.Label>CSV eBay</Field.Label>
                <FileUpload.Root
                  name='documentCsv'
                  accept={{ 'text/csv': ['.csv'] }}
                  maxFiles={Number.MAX_SAFE_INTEGER}
                >
                  <FileUpload.HiddenInput />
                  <FileUpload.Dropzone minH='32' borderWidth='1px' borderColor='gray.200' borderRadius='md' p='5'>
                    <FileUpload.DropzoneContent>
                      <Text fontWeight='600'>Deposez les CSV ici</Text>
                      <Text color='gray.600' textStyle='sm'>
                        ou selectionnez un ou plusieurs fichiers
                      </Text>
                    </FileUpload.DropzoneContent>
                  </FileUpload.Dropzone>
                  <FileUpload.List showSize clearable />
                </FileUpload.Root>
                <Field.HelperText>Vous pouvez selectionner plusieurs fichiers CSV.</Field.HelperText>
              </Field.Root>
            </Grid>
            <Button type='submit' colorPalette='brand' alignSelf='flex-start'>
              Analyser
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
}
