import { Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import CreateFlow from "./pages/CreateFlow";
import HomePage from "./pages/HomePage";
import ImpressumPage from "./pages/ImpressumPage";
import NotFoundPage from "./pages/NotFoundPage";
import OwnerPage from "./pages/OwnerPage";
import PlayFlow from "./pages/PlayFlow";
import PrivacyPage from "./pages/PrivacyPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateFlow />} />
        <Route path="/my/:ownerToken" element={<OwnerPage />} />
        <Route path="/t/:publicToken" element={<PlayFlow />} />
        <Route path="/datenschutz" element={<PrivacyPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
