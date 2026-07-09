import { redirect } from 'react-router';

export const loader = async () => redirect('/sales');

export default function WizardIndexRoute() {
  return null;
}
