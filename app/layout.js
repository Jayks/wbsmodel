import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "WBS Cost Model | Executive Portfolio",
  description: "Advanced RFP analysis and work breakdown costing engine.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-[#020617] text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
