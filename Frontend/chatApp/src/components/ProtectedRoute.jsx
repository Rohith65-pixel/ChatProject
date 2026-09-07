import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({fromPrivate = true}) => {
    const user = localStorage.getItem("user");
    if(user && !fromPrivate) {
        return <Navigate to="/chat" replace />;
    }
    
    if (!user && fromPrivate) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
