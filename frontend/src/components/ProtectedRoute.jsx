import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { FadeLoader } from 'react-spinners';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FadeLoader color="#ff3b30" height={15} width={5} />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;
    if (roles && !roles.includes(user.role)) {
        return (
            <div className="text-center py-20 text-red-500 text-lg">
                You don't have permission to view this page.
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;