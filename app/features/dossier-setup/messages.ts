import { success } from '~/shared/errors/messages';

export const setupSaved = () => [success('setup-saved', 'Parametres du trimestre enregistres.')] as const;
