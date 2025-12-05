import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Impossible Quiz",
  description: "Mobile-first quiz app for in-person quizzes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
