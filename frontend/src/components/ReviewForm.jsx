import { useState } from 'react';
import StarRating from './StarRating';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiSend } from 'react-icons/fi';

const ReviewForm = ({ onSubmit, isSubmitting = false }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [internalLoading, setInternalLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error('Please select a rating before submitting.');
            return;
        }

        setInternalLoading(true);
        try {
            // Await the onSubmit in case the parent passes an async function
            await onSubmit({ rating, comment });
            setRating(0);
            setComment('');
        } catch (err) {
           
            console.error('Review submission error:', err);
        } finally {
            setInternalLoading(false);
        }
    };

    const loading = isSubmitting || internalLoading;

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col gap-6"
        >
            {/* Header */}
            <div>
                <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1.5">
                    <FiMessageSquare className="text-amber-500" />
                    Leave a Review
                </h4>
                <p className="text-sm text-slate-500">
                    How was your experience? Your feedback helps us improve.
                </p>
            </div>

            {/* Interactive Star Rating Area */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-amber-100 hover:bg-amber-50/30">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Tap to Rate
                </p>
                <StarRating rating={rating} onRate={setRating} size="xl" interactive={!loading} />
            </div>

            {/* Comment Textarea */}
            <div>
                <label
                    htmlFor="comment"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                >
                    Additional Comments <span className="text-slate-400 font-medium normal-case tracking-normal">(Optional)</span>
                </label>
                <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={loading}
                    placeholder="Tell us what you liked or what could be better..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-amber-50 focus:border-amber-400 outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={3}
                />
            </div>

            {/* Submit Action */}
            <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-md transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 disabled:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
                {loading ? (
                    <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Submitting...</span>
                    </>
                ) : (
                    <>
                        <FiSend size={16} />
                        <span>Submit Review</span>
                    </>
                )}
            </button>
        </form>
    );
};

export default ReviewForm;
