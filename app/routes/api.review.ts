import { apiSuccess } from '~/shared/errors/api';
import { info } from '~/shared/errors/messages';

export const action = async () =>
  apiSuccess({ ready: true }, [
    info(
      'review-placeholder',
      'Vérification consolidée prête. La génération exécutera les contrôles complets côté Worker.',
    ),
  ]);
