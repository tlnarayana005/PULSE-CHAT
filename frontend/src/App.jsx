import Navbar from "./components/Navbar";
import { Routes, Route } from "react-router-dom";
import Homepage from "./pages/HomePage";
import Signuppage from "./pages/SignUpPage";
import Loginpage from "./pages/LoginPage";
import Settingspage from "./pages/settingsPage";
import Profilepage from "./pages/ProfilePage";
import { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore"; 
import { Loader } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useThemeStore } from "./store/useThemeStore";



export default function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme }=useThemeStore();
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  console.log({ authUser });
  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size -10 animate-spin"/>
  </div>
    )
  return (
    <div data-theme={theme}>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={authUser ? <Homepage /> : <Navigate to="/login" />}
        />
        <Route path="/signup" element={!authUser ?<Signuppage />:<Navigate to ="/"/>} />
        <Route path="/login" element={!authUser ?<Loginpage />:<Navigate to ="/"/>} />
        <Route path="/settings" element={<Settingspage />} />
        <Route path="/profile" element={authUser ? <Profilepage /> : <Navigate to="/login" />} />
      </Routes>
      <Toaster/>
    </div>
  );
}
