import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './authContext'; 

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useAuth(); 
    const [cartCount, setCartCount] = useState(0);

    const fetchCartCount = async () => {
        
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

    
    useEffect(() => {
        if (user?.role === 'CUSTOMER') {

            fetchCartCount();
        }
    }, [user]); 

   
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
