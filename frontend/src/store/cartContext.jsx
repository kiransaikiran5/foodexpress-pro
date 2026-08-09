import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './authContext'; // <-- Import your auth context

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useAuth(); // <-- Listen to the logged-in user
    const [cartCount, setCartCount] = useState(0);

    const fetchCartCount = async () => {
        // If there is no user, reset cart to 0 and stop.
        if (!user) {
            setCartCount(0);
            return;
        }

        try {
            const res = await api.get('/cart');
            const items = res.data.items || [];
            // Sums up the exact quantities of all items
            const total = items.reduce((sum, item) => sum + item.quantity, 0);
            setCartCount(total);
        } catch {
            // if error, set 0
            setCartCount(0);
        }
    };

    // Auto-fetch the cart count whenever the user's login state changes
    useEffect(() => {
        if (user?.role === 'CUSTOMER') {

            fetchCartCount();
        }
    }, [user]); // <-- The magic happens here!

    // Expose a manual refresh function for other components to call
    const refreshCartCount = () => {
        fetchCartCount();
    };

    return (
        <CartContext.Provider value={{ cartCount, refreshCartCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);