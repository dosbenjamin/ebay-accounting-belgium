import type { InputValidationError } from '~/shared/effect/validation';
import { error, type ViewMessage } from './messages';

export const validationErrorMessages = (validationError: InputValidationError): readonly ViewMessage[] => [
  error(
    `${validationError.scope}-validation`,
    validationError.scope === 'json'
      ? 'Les donnees envoyees sont invalides. Verifiez le formulaire puis reessayez.'
      : validationError.scope === 'form'
        ? 'Le formulaire est incomplet ou invalide.'
        : 'Les parametres de la requete sont invalides.',
  ),
];
