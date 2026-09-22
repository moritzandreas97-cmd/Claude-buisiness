export default function PrivacyPage() {
  return (
    <main className="screen legal-page">
      <h1>Datenschutz</h1>
      <p>
        Diese Seite beschreibt sachlich, welche Daten REAL ONES aktuell speichert. Sie ersetzt
        keine Rechtsberatung.{" "}
        <span className="placeholder">
          Vor einem öffentlichen Launch muss dieser Text von einer sachkundigen Stelle geprüft und
          um die fehlenden Angaben ergänzt werden.
        </span>
      </p>

      <h2>Verantwortlicher</h2>
      <p className="placeholder">
        [Name/Firma], [Straße Hausnummer], [PLZ Ort], [Land] – [E-Mail-Adresse]
      </p>

      <h2>Was wir speichern</h2>
      <ul>
        <li>Name bzw. Spitzname, den du beim Erstellen oder Spielen eines Tests eingibst</li>
        <li>Deine Antworten und den daraus berechneten Score</li>
        <li>Zeitpunkt der Erstellung bzw. Teilnahme</li>
        <li>
          Technische Zugriffs-Tokens (öffentlicher Link, privater Ersteller-Link), um Tests
          eindeutig zuzuordnen
        </li>
        <li>
          Nutzungsereignisse (z. B. „Link geöffnet", „Test gestartet"), verknüpft mit der
          jeweiligen Test-ID – nicht mit einer Identität über den eingegebenen Namen hinaus
        </li>
      </ul>

      <h2>Was wir nicht dauerhaft speichern</h2>
      <ul>
        <li>Keine IP-Adressen (nur kurzzeitig im Arbeitsspeicher zur Missbrauchsabwehr/Rate Limiting, nicht in der Datenbank)</li>
        <li>Keine Geräte-Fingerprints oder Tracking-Cookies</li>
        <li>Keine E-Mail-Adressen oder Passwörter – es gibt kein Nutzerkonto</li>
      </ul>

      <h2>localStorage</h2>
      <p>
        Wenn du selbst einen Test erstellst, merkt sich dein Browser lokal (localStorage) den
        privaten Link zu deinem Ergebnis, damit du ihn auf demselben Gerät wiederfindest. Diese
        Information verlässt dein Gerät nicht und wird nicht an uns übertragen.
      </p>

      <h2>Speicherdauer &amp; Löschung</h2>
      <p className="placeholder">
        Aktuell gibt es noch keine automatische Löschfrist und keine Selbstlöschfunktion für
        Ersteller. Das muss vor einem öffentlichen Launch ergänzt werden – bis dahin: Anfragen zur
        Löschung deiner Daten bitte an [E-Mail-Adresse].
      </p>

      <h2>Rechtsgrundlage</h2>
      <p className="placeholder">
        [Rechtsgrundlage ergänzen, z. B. Art. 6 Abs. 1 DSGVO – bitte fachkundig prüfen lassen.]
      </p>
    </main>
  );
}
