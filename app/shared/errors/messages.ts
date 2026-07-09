import { Data, Schema } from 'effect';

export const MessageSeverity = Schema.Literal('success', 'info', 'warning', 'error');
export type MessageSeverity = Schema.Schema.Type<typeof MessageSeverity>;

export const ViewMessage = Schema.Struct({
  id: Schema.String,
  severity: MessageSeverity,
  text: Schema.String,
  target: Schema.optional(
    Schema.Struct({
      step: Schema.optional(Schema.String),
      fileName: Schema.optional(Schema.String),
      column: Schema.optional(Schema.String),
      invoiceId: Schema.optional(Schema.String),
      currency: Schema.optional(Schema.String),
    }),
  ),
});
export type ViewMessage = Schema.Schema.Type<typeof ViewMessage>;

export const success = (id: string, text: string): ViewMessage => ({
  id,
  severity: 'success',
  text,
});

export const info = (id: string, text: string): ViewMessage => ({
  id,
  severity: 'info',
  text,
});

export const warning = (id: string, text: string, target?: ViewMessage['target']): ViewMessage => ({
  id,
  severity: 'warning',
  text,
  ...(target ? { target } : {}),
});

export const error = (id: string, text: string, target?: ViewMessage['target']): ViewMessage => ({
  id,
  severity: 'error',
  text,
  ...(target ? { target } : {}),
});

export class UnexpectedAppError extends Data.TaggedError('UnexpectedAppError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export const toUnknownErrorMessage = (_cause: unknown): ViewMessage =>
  error('unexpected', 'Une erreur inattendue est survenue. Vérifiez les fichiers et réessayez.');
