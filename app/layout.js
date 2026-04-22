import "./globals.css";

export const metadata = {
  title: "Probabilistic Market Intelligence",
  description:
    "La probabilité de hausse des grands actifs mondiaux, horizon par horizon."
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
