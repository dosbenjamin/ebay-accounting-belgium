import type { InputValidationError } from '~/shared/effect/validation';
import { error, type ViewMessage } from './messages';

export const validationErrorMessages = (validationError: InputValidationError): readonly ViewMessage[] => [
  error(
    `${validationError.scope}-validation`,
    validationError.scope === 'json'
      ? 'Les données envoyées sont invalides. Vérifiez le formulaire puis réessayez.'
      : validationError.scope === 'form'
        ? 'Le formulaire est incomplet ou invalide.'
        : 'Les paramètres de la requête sont invalides.',
  ),
];
