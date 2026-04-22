import "./globals.css";

export const metadata = {
  title: "Northcurve | Probabilistic Market Intelligence",
  description:
    "La probabilite de hausse des grands actifs mondiaux, horizon par horizon."
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
