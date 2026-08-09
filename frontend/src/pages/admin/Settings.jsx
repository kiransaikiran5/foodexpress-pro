import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    FiSave,
    FiDownload,
    FiSettings,
    FiPercent,
    FiTruck,
    FiCreditCard,
    FiBell,
    FiMail,
    FiDatabase,
    FiPlusCircle,
    FiTrash2,
    FiServer
} from 'react-icons/fi';

const TABS = [
    { key: 'General', icon: FiSettings, label: 'General' },
    { key: 'Tax', icon: FiPercent, label: 'Tax Rates' },
    { key: 'Delivery', icon: FiTruck, label: 'Delivery' },
    { key: 'Payment', icon: FiCreditCard, label: 'Payment' },
    { key: 'Notifications', icon: FiBell, label: 'Notifications' },
    { key: 'Email/SMS', icon: FiMail, label: 'SMTP Config' },
    { key: 'Backup', icon: FiDatabase, label: 'Backup' }
];

const AdminSettings = () => {
    const [settings, setSettings] = useState(null);
    const [activeTab, setActiveTab] = useState('General');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});

    const fetchSettings = async () => {
        try {
            const res = await api.get('/admin/settings/');
            setSettings(res.data.settings);
            setForm(res.data.settings || {});
        } catch (err) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleChange = (section, key, value) => {
        setForm(prev => ({
            ...prev,
            [section]: { ...(prev[section] || {}), [key]: value }
        }));
    };

    const handleArrayItemChange = (section, index, field, value) => {
        const arr = [...(form[section] || [])];
        arr[index] = { ...arr[index], [field]: value };
        setForm(prev => ({ ...prev, [section]: arr }));
    };

    const addArrayItem = (section, template) => {
        const arr = [...(form[section] || []), template];
        setForm(prev => ({ ...prev, [section]: arr }));
    };

    const removeArrayItem = (section, index) => {
        const arr = form[section].filter((_, i) => i !== index);
        setForm(prev => ({ ...prev, [section]: arr }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/admin/settings/', { settings: form });
            toast.success('Settings saved successfully');
            fetchSettings();
        } catch (err) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleBackup = async () => {
        const loadingToast = toast.loading('Generating backup...');
        try {
            const res = await api.post('/admin/settings/backup');
            const blob = new Blob([JSON.stringify(res.data.backup, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `foodexpress_backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Backup downloaded successfully', { id: loadingToast });
        } catch (err) {
            toast.error('Backup failed', { id: loadingToast });
        }
    };

    if (loading || !settings) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading system settings...</p>
            </div>
        );
    }

    const inputClassName = "h-12 w-full border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all";
    const labelClassName = "block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2";

    return (
        <main className="min-h-[calc(100vh-80px)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <FiServer className="text-blue-500" /> Platform Settings
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500">Configure core application variables and integrations.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-12 flex items-center gap-2 bg-slate-900 text-white px-6 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center shrink-0"
                    >
                        <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 overflow-x-auto scrollbar-hide">
                    <div className="flex space-x-1 sm:space-x-2 min-w-max">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${activeTab === tab.key
                                        ? 'bg-slate-900 text-white shadow-md scale-100'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 scale-95 hover:scale-100'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-10 transition-all min-h-[400px]">

                    {/* General Tab */}
                    {activeTab === 'General' && (
                        <div className="animate-in fade-in space-y-6">
                            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">General Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClassName}>Platform Name</label>
                                    <input type="text" value={form.platform_name || ''} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} className={inputClassName} placeholder="E.g. FoodExpress" />
                                </div>
                                <div className="hidden md:block"></div>
                                <div>
                                    <label className={labelClassName}>Contact Email</label>
                                    <input type="email" value={form.contact_email || ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputClassName} placeholder="support@yourdomain.com" />
                                </div>
                                <div>
                                    <label className={labelClassName}>Contact Phone</label>
                                    <input type="text" value={form.contact_phone || ''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inputClassName} placeholder="+1 234 567 8900" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tax Tab */}
                    {activeTab === 'Tax' && (
                        <div className="animate-in fade-in space-y-6">
                            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Tax Rates</h3>

                            <div className="space-y-4">
                                {Array.isArray(form.tax_rates) && form.tax_rates.map((rate, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <div className="flex-1 w-full">
                                            <label className={labelClassName}>Tax Name</label>
                                            <input type="text" value={rate.name} onChange={(e) => handleArrayItemChange('tax_rates', idx, 'name', e.target.value)} className={inputClassName} placeholder="e.g. SGST (9%)" />
                                        </div>
                                        <div className="w-full sm:w-32">
                                            <label className={labelClassName}>Rate (%)</label>
                                            <input type="number" step="0.1" value={rate.rate} onChange={(e) => handleArrayItemChange('tax_rates', idx, 'rate', parseFloat(e.target.value) || 0)} className={inputClassName} />
                                        </div>
                                        <button onClick={() => removeArrayItem('tax_rates', idx)} className="h-12 w-full sm:w-12 flex items-center justify-center bg-white border border-red-200 text-red-500 rounded-xl hover:bg-red-50 hover:border-red-300 transition shrink-0" title="Remove Tax">
                                            <FiTrash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => addArrayItem('tax_rates', { name: 'New Tax', rate: 0 })} className="h-12 px-6 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition w-full active:scale-[0.99]">
                                <FiPlusCircle size={18} /> Add Tax Rate
                            </button>
                        </div>
                    )}

                    {/* Delivery Tab */}
                    {activeTab === 'Delivery' && (
                        <div className="animate-in fade-in space-y-6">
                            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Delivery Charges</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClassName}>Base Charge (₹)</label>
                                    <input type="number" step="0.1" value={form.delivery_charges?.base || 0} onChange={(e) => handleChange('delivery_charges', 'base', parseFloat(e.target.value) || 0)} className={inputClassName} />
                                </div>
                                <div>
                                    <label className={labelClassName}>Per KM Charge (₹)</label>
                                    <input type="number" step="0.1" value={form.delivery_charges?.per_km || 0} onChange={(e) => handleChange('delivery_charges', 'per_km', parseFloat(e.target.value) || 0)} className={inputClassName} />
                                </div>
                                <div>
                                    <label className={labelClassName}>Free Delivery Above (₹)</label>
                                    <input type="number" step="0.1" value={form.delivery_charges?.free_above || 0} onChange={(e) => handleChange('delivery_charges', 'free_above', parseFloat(e.target.value) || 0)} className={inputClassName} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Tab */}
                    {activeTab === 'Payment' && (
                        <div className="animate-in fade-in space-y-6">
                            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Payment Gateway</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div>
                                    <label className={labelClassName}>Provider</label>
                                    <select value={form.payment_gateway?.provider || 'razorpay'} onChange={(e) => handleChange('payment_gateway', 'provider', e.target.value)} className={`${inputClassName} cursor-pointer`}>
                                        <option value="razorpay">Razorpay</option>
                                        <option value="stripe">Stripe</option>
                                        <option value="paytm">Paytm</option>
                                    </select>
                                </div>
                                <div className="h-12 flex items-center px-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={form.payment_gateway?.test_mode || false} onChange={(e) => handleChange('payment_gateway', 'test_mode', e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="font-bold text-slate-700">Enable Test Mode</span>
                                    </label>
                                </div>
                                <div className="md:col-span-2 pt-4 border-t border-slate-100"></div>
                                <div>
                                    <label className={labelClassName}>API Key ID</label>
                                    <input type="text" value={form.payment_gateway?.key_id || ''} onChange={(e) => handleChange('payment_gateway', 'key_id', e.target.value)} className={inputClassName} placeholder="pk_test_..." />
                                </div>
                                <div>
                                    <label className={labelClassName}>API Key Secret</label>
                                    <input type="password" value={form.payment_gateway?.key_secret || ''} onChange={(e) => handleChange('payment_gateway', 'key_secret', e.target.value)} className={inputClassName} placeholder="••••••••••••••••" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'Notifications' && (
                        <div className="animate-in fade-in space-y-6">
                            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">Message Templates</h3>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className={labelClassName}>Order Placed (Customer)</label>
                                    <textarea value={form.notification_templates?.order_placed || ''} onChange={(e) => handleChange('notification_templates', 'order_placed', e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" placeholder="Your order #{order_id} has been received!" />
                                </div>
                                <div>
                                    <label className={labelClassName}>Order Accepted (Restaurant)</label>
                                    <textarea value={form.notification_templates?.order_accepted || ''} onChange={(e) => handleChange('notification_templates', 'order_accepted', e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" />
                                </div>
                                <div>
                                    <label className={labelClassName}>Order Delivered</label>
                                    <textarea value={form.notification_templates?.order_delivered || ''} onChange={(e) => handleChange('notification_templates', 'order_delivered', e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" />
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <label className={labelClassName}>Global Promo Message</label>
                                    <textarea value={form.notification_templates?.promo || ''} onChange={(e) => handleChange('notification_templates', 'promo', e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" placeholder="Use code WEEKEND20 for 20% off!" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email/SMS Tab */}
                    {activeTab === 'Email/SMS' && (
                        <div className="animate-in fade-in space-y-6">
                            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">SMTP Configuration</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClassName}>SMTP Host</label>
                                    <input type="text" value={form.smtp_config?.host || ''} onChange={(e) => handleChange('smtp_config', 'host', e.target.value)} className={inputClassName} placeholder="smtp.gmail.com" />
                                </div>
                                <div>
                                    <label className={labelClassName}>SMTP Port</label>
                                    <input type="number" value={form.smtp_config?.port || 587} onChange={(e) => handleChange('smtp_config', 'port', parseInt(e.target.value) || 587)} className={inputClassName} placeholder="587" />
                                </div>
                                <div>
                                    <label className={labelClassName}>Username</label>
                                    <input type="text" value={form.smtp_config?.username || ''} onChange={(e) => handleChange('smtp_config', 'username', e.target.value)} className={inputClassName} />
                                </div>
                                <div>
                                    <label className={labelClassName}>Password / App Password</label>
                                    <input type="password" value={form.smtp_config?.password || ''} onChange={(e) => handleChange('smtp_config', 'password', e.target.value)} className={inputClassName} placeholder="••••••••••••••••" />
                                </div>
                                <div className="md:col-span-2 pt-2">
                                    <label className={labelClassName}>From Email Address</label>
                                    <input type="email" value={form.smtp_config?.from_email || ''} onChange={(e) => handleChange('smtp_config', 'from_email', e.target.value)} className={inputClassName} placeholder="noreply@foodexpress.com" />
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mt-4">
                                <p className="text-xs font-bold text-blue-800">Note: These dynamic settings override the environment variables (.env) when sending emails.</p>
                            </div>
                        </div>
                    )}

                    {/* Backup Tab */}
                    {activeTab === 'Backup' && (
                        <div className="animate-in fade-in flex flex-col items-center justify-center text-center py-12">
                            <div className="h-20 w-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                                <FiDatabase size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Database Backup</h3>
                            <p className="text-sm font-medium text-slate-500 max-w-sm mb-8">
                                Securely download a full JSON snapshot of all critical platform tables including settings, users, and orders.
                            </p>
                            <button
                                onClick={handleBackup}
                                className="h-14 flex items-center gap-3 bg-blue-600 text-white px-8 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <FiDownload size={20} /> Download JSON Backup
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default AdminSettings;