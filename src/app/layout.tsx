import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';
import CartProvider from "@/components/cart/CartProvider";
import LoadingProvider from "@/components/providers/LoadingProvider";
import { CustomerProvider } from "@/components/providers/CustomerProvider";
import { ToastProvider } from "@/components/ui/toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LaunchingSoonProvider from "@/components/providers/LaunchingSoonProvider";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import FooterWrapper from "@/components/layout/FooterWrapper";

// Dynamic imports with proper error handling
const LaunchingStateServer = dynamic(
  () => import('@/components/LaunchingStateServer'),
  { ssr: true, loading: () => null }
);

const LaunchUtilsInitializer = dynamic(
  () => import('@/components/utils/LaunchUtilsInitializer'),
  { ssr: false, loading: () => null }
);

// Serif font for headings
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// Sans-serif font for body text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ankkor | Timeless Menswear",
  description: "Elevated essentials for the discerning gentleman. Impeccably tailored garments crafted from the finest materials.",
  keywords: ["menswear", "luxury clothing", "tailored", "shirts", "accessories"],
  icons: {
    icon: [
      { url: '/logo.PNG', sizes: '32x32', type: 'image/png' },
      { url: '/logo.PNG', sizes: '16x16', type: 'image/png' }
    ],
    shortcut: '/logo.PNG',
    apple: '/logo.PNG',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${inter.variable} font-sans antialiased min-h-screen bg-[#f8f8f5]`}
      >
        <ToastProvider>
          <CustomerProvider>
            <CartProvider>
              <LoadingProvider>
                <LaunchingSoonProvider>
                  <LaunchingStateServer />
                  <LaunchUtilsInitializer />
                  <NavbarWrapper />
                  <main style={{ paddingTop: 0 }} className="transition-all duration-300">
                    {children}
                  </main>
                <FooterWrapper /> 
                </LaunchingSoonProvider>
              </LoadingProvider>
            </CartProvider>
          </CustomerProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
