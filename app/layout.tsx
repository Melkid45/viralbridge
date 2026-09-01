import type { Metadata } from "next";
import "./global.scss";
import { Rethink_Sans } from 'next/font/google'
import Header from "./_components/_general/Header/Header";
export const metadata: Metadata = {
  title: "Viral Bridge — AI Growth Operating System",
  description:
    "Viral Bridge connects market intelligence, SEO, content and execution in one AI growth operating system.",
};


const rethinkSans = Rethink_Sans({
  weight: 'variable',
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={rethinkSans.className}>
        <Header/>
        {children}
      </body>
    </html>
  );
}
