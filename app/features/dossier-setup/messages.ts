import { success } from '~/shared/errors/messages';

export const setupSaved = () => [success('setup-saved', 'Paramètres du trimestre enregistrés.')] as const;
