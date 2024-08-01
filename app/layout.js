import { Oswald, Bebas_Neue } from 'next/font/google';
import './globals.css';

const oswald = Oswald({ subsets: ['latin'] });
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${oswald.variable} ${bebasNeue.variable} bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
