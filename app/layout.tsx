import type { Metadata } from "next";
import "./global.scss";
import { Inter, Roboto, Roboto_Mono } from 'next/font/google'
import Header from "./_components/_general/Header/Header";
import localFont from 'next/font/local'
export const metadata: Metadata = {
  title: "Viral Bridge — AI Growth Operating System",
  description:
    "Viral Bridge connects market intelligence, SEO, content and execution in one AI growth operating system.",
};


const bdogFont = localFont({
  variable: '--secondary-font',
  src: './fonts/BDOGrotesk-VF.ttf',
  weight: '300 900',
  style: 'normal',
  display: 'swap',
})

const interFont = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const robotoFont = Roboto_Mono({
  variable: '--font-number',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${interFont.variable} ${bdogFont.variable} ${robotoFont.variable}`}>
        <Header/>
        {children}
      </body>
    </html>
  );
}
