import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import CartProvider from "@/components/cart/CartProvider";
import LoadingProvider from "@/components/providers/LoadingProvider";
import { CustomerProvider } from "@/components/providers/CustomerProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import LaunchingSoonProvider from "@/components/providers/LaunchingSoonProvider";
import LaunchingStateInitializer from "@/components/LaunchingStateInitializer";
import LaunchUtilsInitializer from "@/components/utils/LaunchUtilsInitializer";
import LaunchingSoonOverlay from "@/components/LaunchingSoonOverlay";
import StoreHydrationInitializer from "@/components/StoreHydrationInitializer";
import CartWrapper from "@/components/cart/CartWrapper";
import NavbarWrapperSSR from "@/components/layout/NavbarWrapperSSR";
import FooterWrapperSSR from "@/components/layout/FooterWrapperSSR";
import { StockUpdateProvider } from "@/contexts/StockUpdateContext";
import { Analytics } from '@vercel/analytics/react';

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
          <AuthProvider>
            <CustomerProvider>
              <StockUpdateProvider>
                <CartProvider>
                  <LoadingProvider>
                    <LaunchingSoonProvider>
                  <LaunchingStateInitializer />
                  <LaunchUtilsInitializer />
                  <StoreHydrationInitializer />
                  <LaunchingSoonOverlay />
                  {/* NavbarWrapper and FooterWrapper - now SSR-safe with dynamic imports */}
                  <NavbarWrapperSSR />
                  <main style={{ paddingTop: 0 }} className="transition-all duration-300">
                    {children}
                  </main>
                  <FooterWrapperSSR />
                    </LaunchingSoonProvider>
                  </LoadingProvider>
                  {/* Cart component - now SSR-safe with skipHydration and proper rehydration */}
                  <CartWrapper />
                </CartProvider>
              </StockUpdateProvider>
            </CustomerProvider>
          </AuthProvider>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
