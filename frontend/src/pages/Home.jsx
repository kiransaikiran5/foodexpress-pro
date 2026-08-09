import { Link } from 'react-router-dom';
import { useAuth } from '../store/authContext';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto text-center py-16">
            <h1 className="text-5xl font-extrabold text-dark mb-4">
                Welcome to <span className="text-primary-500">FoodExpress</span> Pro
            </h1>
            <p className="text-gray-600 text-lg mb-8">
                The ultimate online food delivery platform.
            </p>
            {user ? (
                <div className="bg-white rounded-2xl shadow-card p-8 inline-block">
                    <p className="text-xl">Hello, <strong>{user.full_name}</strong></p>
                    <p className="text-gray-500">Role: {user.role}</p>
                </div>
            ) : (
                <div className="flex gap-4 justify-center">
                    <Link to="/login" className="bg-primary-500 text-white px-8 py-3 rounded-lg hover:bg-primary-600 transition text-lg font-medium">
                        Get Started
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Home;