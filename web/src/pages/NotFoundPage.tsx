import { Link } from "react-router-dom";
import { notFoundTexts } from "../config/texts";

export default function NotFoundPage() {
  return (
    <main className="screen screen-center">
      <h1>{notFoundTexts.headline}</h1>
      <p className="body-text">{notFoundTexts.body}</p>
      <Link to="/" className="btn btn-primary btn-lg">
        {notFoundTexts.cta}
      </Link>
    </main>
  );
}
