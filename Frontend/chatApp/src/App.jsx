import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";
import {ToastContainer} from 'react-toastify';


import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ChatScreen from "./screens/ChatScreen";
import NotFoundScreen from "./screens/NotFoundScreen";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Public Routes */}
                <Route element={<ProtectedRoute fromPrivate={false} />}>
                    <Route path="/login" element={<LoginScreen />} index={true}/>
                    <Route path="/register" element={<RegisterScreen />} />
                </Route>

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/chat" element={<ChatScreen />} />
                </Route>

                {/* 404 - Catch all */}
                <Route path="*" element={<NotFoundScreen />} />
            </Routes>

            <ToastContainer
                position="top-right"
                autoClose={1000}
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />
        </BrowserRouter>
    );
}

export default App;