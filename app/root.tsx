import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { Provider } from '~/shared/ui/provider';
import './styles.css';

export function Layout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang='fr'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
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
