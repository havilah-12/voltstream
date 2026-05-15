import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import LiveDashboard from "./pages/LiveDashboard";
import UsageHistory from "./pages/UsageHistory";
import SmartControl from "./pages/SmartControl";
import Invoices from "./pages/Invoices";
import EnergyAssistant from "./pages/EnergyAssistant";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import Welcome from "./pages/Welcome";
import { AssistantProvider } from "./features/assistant/AssistantContext";

function App() {
  return (
    <AuthProvider>
      <AssistantProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<LiveDashboard />} />
                <Route path="analytics" element={<UsageHistory />} />
                <Route path="devices" element={<SmartControl />} />
                <Route path="billing" element={<Invoices />} />
                <Route path="chat" element={<EnergyAssistant />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AssistantProvider>
    </AuthProvider>
  );
}

export default App;
