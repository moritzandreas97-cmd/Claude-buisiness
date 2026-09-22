import { Link } from "react-router-dom";
import { brand, homeTexts } from "../config/texts";

export default function HomePage() {
  return (
    <main className="screen screen-center">
      <div className="emoji">{homeTexts.emoji}</div>
      <p className="eyebrow">{brand.name}</p>
      <h1>{homeTexts.headline}</h1>
      <p className="body-text">{homeTexts.subheadline}</p>
      <Link to="/create" className="btn btn-primary btn-lg">
        {homeTexts.cta}
      </Link>
      <p className="footnote">{homeTexts.footnote}</p>
    </main>
  );
}
