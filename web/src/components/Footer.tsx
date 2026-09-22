import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="app-footer">
      <Link to="/datenschutz">Datenschutz</Link>
      <span className="app-footer-sep" aria-hidden="true">
        ·
      </span>
      <Link to="/impressum">Impressum</Link>
    </footer>
  );
}
