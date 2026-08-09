import { Fragment } from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <Fragment>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onClick={onClose} />
            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-elevated w-full max-w-md transform transition-all scale-100">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <h3 className="text-xl font-semibold text-dark">{title}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6">{children}</div>
                </div>
            </div>
        </Fragment>
    );
};

export default Modal;