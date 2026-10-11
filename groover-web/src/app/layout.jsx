import { Noto_Sans_KR, Noto_Serif_KR } from 'next/font/google';
import './globals.css';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { Providers } from '@/lib/providers';
const sans = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Noto_Serif_KR({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-serif', display: 'swap' });
export const metadata = { title: { default: 'Groover — 후기를 고르는 더 나은 방법', template: '%s | Groover' }, description: '광고보다 솔직한 사용자 리뷰를 발견하고 나누는 공간입니다.' };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f6f2' };
export default function RootLayout({ children }) {
    return <html lang="ko"><body className={`${sans.variable} ${serif.variable}`}><Providers><div className="app-shell"><main>{children}</main><BottomTabBar /></div></Providers></body></html>;
}
