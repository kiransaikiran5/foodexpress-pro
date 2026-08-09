const CustomerTabs = ({ activeTab, onTabChange, tabs = [] }) => {
    // Default fallback just in case the parent forgets to pass the tabs prop
    const displayTabs = tabs.length > 0 ? tabs : [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'profile', label: 'Profile' },
        { key: 'addresses', label: 'Addresses' },
        { key: 'saved-locations', label: 'Saved Locations' },
        { key: 'favorites', label: 'Favorites' },
        { key: 'preferences', label: 'Preferences' },
    ];

    return (
        <div className="flex space-x-1 sm:space-x-2 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
            {displayTabs.map((tab) => {
                const isActive = activeTab === tab.key;

                return (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={`
                            flex-1 min-w-fit whitespace-nowrap rounded-xl px-4 sm:px-6 py-2.5 text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100
                            ${isActive
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5 scale-100'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95 hover:scale-100'
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};

export default CustomerTabs;