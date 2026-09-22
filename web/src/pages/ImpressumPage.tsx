export default function ImpressumPage() {
  return (
    <main className="screen legal-page">
      <h1>Impressum</h1>
      <p className="placeholder">
        Vor einem öffentlichen Launch müssen hier echte Betreiberangaben stehen (u. a. Pflicht
        nach § 5 TMG / § 18 MStV in Deutschland). Die folgenden Felder sind Platzhalter.
      </p>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p className="placeholder">
        [Vor- und Nachname bzw. Firmenname]
        <br />
        [Straße Hausnummer]
        <br />
        [PLZ Ort]
        <br />
        [Land]
      </p>

      <h2>Kontakt</h2>
      <p className="placeholder">
        E-Mail: [E-Mail-Adresse]
        <br />
        Telefon: [Telefonnummer, optional]
      </p>

      <h2>Vertretungsberechtigte Person (falls Firma)</h2>
      <p className="placeholder">[Name, falls zutreffend]</p>

      <h2>Registereintrag (falls zutreffend)</h2>
      <p className="placeholder">[Handelsregister, Registergericht, Registernummer]</p>

      <h2>Umsatzsteuer-ID (falls zutreffend)</h2>
      <p className="placeholder">[USt-IdNr. gemäß § 27a UStG]</p>

      <h2>Inhaltlich verantwortlich gemäß § 18 Abs. 2 MStV</h2>
      <p className="placeholder">[Name, Anschrift wie oben]</p>
    </main>
  );
}
