import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    FiSend,
    FiImage,
    FiUser,
    FiMessageSquare,
    FiArrowLeft,
    FiX
} from 'react-icons/fi';
import { useAuth } from '../store/authContext';

const Chat = () => {
    const { user } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Fetch Contacts
    const fetchContacts = async () => {
        try {
            const res = await api.get('/chat/contacts');
            const uniqueContacts = Array.from(new Map(res.data.map(c => [c.user_id, c])).values());
            setContacts(uniqueContacts);
        } catch { }
    };

    // Fetch Messages
    const fetchMessages = async (otherUserId) => {
        try {
            const res = await api.get(`/chat/messages/${otherUserId}`);
            setMessages(Array.isArray(res.data) ? res.data : []);
        } catch { }
    };

    // Polling for contacts
    useEffect(() => {
        fetchContacts();
        const interval = setInterval(fetchContacts, 5000);
        return () => clearInterval(interval);
    }, []);

    // Polling for active chat messages
    useEffect(() => {
        if (selectedContact) {
            fetchMessages(selectedContact.user_id);
            const interval = setInterval(() => fetchMessages(selectedContact.user_id), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedContact]);

    // THE FIX: Auto-scroll to bottom ONLY when a new message is added (messages.length changes)
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, imagePreview]);

    // Handle Image Selection & Preview
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    // Send Message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() && !imageFile) return;

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('receiver_id', selectedContact.user_id);
            if (input.trim()) formData.append('message', input.trim());
            if (imageFile) formData.append('image', imageFile);

            await api.post('/chat/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setInput('');
            clearImage();
            fetchMessages(selectedContact.user_id);
            fetchContacts();
        } catch (err) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleContactSelect = (contact) => {
        setSelectedContact(contact);
    };

    const handleBackToList = () => {
        setSelectedContact(null);
    };

    // Time Formatter
    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <main className="min-h-[calc(100vh-72px)] bg-slate-50 p-4 sm:p-6 flex justify-center items-start">
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 flex overflow-hidden h-[calc(100vh-110px)] sm:h-[calc(100vh-130px)]">

                {/* ---------- Sidebar: Contacts ---------- */}
                <div className={`w-full md:w-80 lg:w-[380px] flex flex-col border-r border-slate-100 bg-slate-50/50 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-5 border-b border-slate-100 shrink-0 bg-white">
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            Messages
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
                        {contacts.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-3">
                                <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-300">
                                    <FiMessageSquare size={24} />
                                </div>
                                <p className="text-sm font-semibold text-slate-500">No conversations yet.</p>
                            </div>
                        )}

                        {contacts.map((c) => {
                            const isSelected = selectedContact?.user_id === c.user_id;
                            return (
                                <div
                                    key={c.user_id}
                                    onClick={() => handleContactSelect(c)}
                                    className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${isSelected
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : 'bg-transparent hover:bg-white hover:shadow-sm text-slate-900 border border-transparent hover:border-slate-100'
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold uppercase shadow-inner ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {c.name ? c.name.charAt(0) : <FiUser size={20} />}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                                {c.name || 'Unknown User'}
                                            </span>
                                            {c.unread_count > 0 && (
                                                <span className={`text-[10px] font-black rounded-full px-2 py-0.5 shadow-sm shrink-0 ml-2 ${isSelected ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                                                    }`}>
                                                    {c.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs truncate ${isSelected ? 'text-blue-100' : c.unread_count > 0 ? 'font-bold text-slate-800' : 'text-slate-500'
                                            }`}>
                                            {c.last_message || <span className="italic opacity-70">No messages yet</span>}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ---------- Main Chat Area ---------- */}
                <div className={`flex-1 flex flex-col bg-white relative ${selectedContact ? 'flex' : 'hidden md:flex'}`}>

                    {selectedContact ? (
                        <>
                            <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-slate-100 bg-white shrink-0 shadow-sm z-10">
                                <button
                                    onClick={handleBackToList}
                                    className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition shrink-0"
                                >
                                    <FiArrowLeft size={18} />
                                </button>
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold uppercase border border-blue-100 shrink-0">
                                    {selectedContact.name ? selectedContact.name.charAt(0) : <FiUser size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate text-base leading-tight">{selectedContact.name || 'Unknown User'}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedContact.role || 'User'}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30">
                                {messages.length === 0 ? (
                                    <div className="flex h-full items-center justify-center">
                                        <p className="text-sm font-semibold text-slate-400 bg-slate-100 px-5 py-2.5 rounded-full border border-slate-200">
                                            Start a conversation with {selectedContact.name}
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe = msg.sender_id === user.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'
                                                        }`}
                                                >
                                                    <div
                                                        className={`px-5 py-3.5 shadow-sm ${isMe
                                                                ? 'bg-blue-600 text-white rounded-[1.25rem] rounded-tr-sm'
                                                                : 'bg-white border border-slate-100 text-slate-800 rounded-[1.25rem] rounded-tl-sm'
                                                            }`}
                                                    >
                                                        {msg.image_url && (
                                                            <div className="mb-3 overflow-hidden rounded-xl bg-black/5">
                                                                <img
                                                                    src={`http://localhost:8000/${msg.image_url}`}
                                                                    alt="Attachment"
                                                                    className="max-w-full max-h-64 object-contain rounded-xl"
                                                                    onError={(e) => e.target.style.display = 'none'}
                                                                />
                                                            </div>
                                                        )}
                                                        {msg.message && (
                                                            <p className="text-[15px] leading-relaxed break-words">
                                                                {msg.message}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-bold mt-1.5 text-slate-400 px-1">
                                                        {formatTime(msg.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {imagePreview && (
                                <div className="absolute bottom-20 left-4 right-4 sm:left-6 sm:right-6 bg-white border border-slate-200 rounded-2xl p-3 shadow-xl z-20 animate-in slide-in-from-bottom-4">
                                    <div className="relative inline-block">
                                        <img src={imagePreview} alt="Preview" className="h-24 w-auto rounded-xl object-cover border border-slate-100" />
                                        <button
                                            type="button"
                                            onClick={clearImage}
                                            className="absolute -top-2 -right-2 bg-slate-900 text-white p-1.5 rounded-full hover:bg-slate-800 shadow-md transition-transform active:scale-95"
                                        >
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 shrink-0 flex items-end gap-3 z-30">
                                <label className="cursor-pointer shrink-0 flex items-center justify-center h-12 w-12 rounded-xl text-slate-400 bg-slate-50 hover:bg-blue-50 hover:text-blue-500 transition-colors border border-slate-100">
                                    <FiImage size={20} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                        disabled={sending}
                                    />
                                </label>

                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-400 transition-all flex items-center min-h-[48px]">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e);
                                            }
                                        }}
                                        placeholder="Type a message..."
                                        disabled={sending}
                                        rows={1}
                                        className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-32 overflow-y-auto"
                                        style={{ height: 'auto' }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending || (!input.trim() && !imageFile)}
                                    className="shrink-0 flex items-center justify-center h-12 w-12 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all shadow-md active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-200"
                                >
                                    {sending ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                                    ) : (
                                        <FiSend size={18} className="ml-1" />
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-4">
                            <div className="h-24 w-24 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-blue-500">
                                <FiMessageSquare size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Your Messages</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                                    Select a conversation from the sidebar to view your chat history or start sending messages.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default Chat;