import { apiSuccess } from '~/shared/errors/api';
import { info } from '~/shared/errors/messages';

export const action = async () =>
  apiSuccess({ ready: true }, [
    info(
      'review-placeholder',
      'Verification consolidee prete. La generation executera les controles complets cote Worker.',
    ),
  ]);
