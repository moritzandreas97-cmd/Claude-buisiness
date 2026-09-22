import { Route, Routes } from "react-router-dom";
import CreateFlow from "./pages/CreateFlow";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import OwnerPage from "./pages/OwnerPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreateFlow />} />
      <Route path="/my/:ownerToken" element={<OwnerPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
