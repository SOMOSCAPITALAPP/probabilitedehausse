import "./globals.css";

export const metadata = {
  title: "Northcurve | Probabilistic Market Intelligence",
  description:
    "Probabilistic market intelligence for major global assets, horizon by horizon.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
