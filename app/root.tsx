import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { Provider } from '~/shared/ui/provider';
import './styles.css';

export const meta = () => [
  { title: 'eBay Accounting Belgium' },
  {
    name: 'description',
    content: 'Preparation comptable trimestrielle eBay pour vendeur belge.',
  },
];

export const links = () => [
  { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon', sizes: 'any' },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
];

export function Layout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Provider>{children}</Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
