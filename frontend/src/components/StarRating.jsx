import { useState } from 'react';
import { FiStar } from 'react-icons/fi';

const StarRating = ({ rating = 0, onRate, interactive = true, size = 'md' }) => {
    const [hover, setHover] = useState(0);

    // Size mappings for versatile usage across the app
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-10 h-10'
    };

    const iconSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div
            className="flex items-center gap-1"
            role={interactive ? "radiogroup" : "img"}
            aria-label={`Rating: ${rating} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = (interactive ? hover || rating : rating) >= starValue;

                return (
                    <button
                        key={starValue}
                        type="button"
                        disabled={!interactive}
                        role={interactive ? "radio" : "presentation"}
                        aria-checked={isFilled}
                        className={`relative focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-100 rounded-full transition-all duration-200 ${interactive
                                ? 'cursor-pointer hover:scale-110 active:scale-95'
                                : 'cursor-default'
                            } ${isFilled
                                ? 'text-amber-400 drop-shadow-sm'
                                : 'text-slate-200 hover:text-amber-200'
                            }`}
                        onMouseEnter={() => interactive && setHover(starValue)}
                        onMouseLeave={() => interactive && setHover(0)}
                        onClick={() => interactive && onRate && onRate(starValue)}
                    >
                        <FiStar
                            className={`${iconSize} transition-colors duration-200`}
                            fill={isFilled ? 'currentColor' : 'none'}
                            strokeWidth={isFilled ? 1.5 : 2}
                        />
                    </button>
                );
            })}
        </div>
    );
};

export default StarRating;