import type { AppProps } from 'next/app';
import { Inter, Roboto_Slab } from 'next/font/google';
import '../styles/global.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-inter',
});

const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-roboto-slab',
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} ${robotoSlab.variable} font-sans`}> 
      <Component {...pageProps} />
    </div>
  );
}
