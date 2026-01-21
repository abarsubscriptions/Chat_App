import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { User, Group } from '../types';

interface SidebarProps {
    users: User[];
    groups: Group[];
    onlineUsers: Set<string>;
    selectedId: string | null;
    onSelect: (id: string, isGroup: boolean) => void;
    onCreateGroup: () => void;
    onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    users, groups, onlineUsers, selectedId, onSelect, onCreateGroup, onOpenSettings
}) => {
    const { user: currentUser, logout } = useAuth();
    const [searchTerm, setSearchTerm] = React.useState("");

    const displayItems = useMemo(() => {
        const items = [];

        // Groups
        for (const g of groups) {
            items.push({
                id: g._id,
                name: g.name,
                type: 'group' as const,
                lastMessageTime: g.last_message_time,
                lastMessage: g.last_message,
                unreadCount: g.unread_count || 0,
                obj: g
            });
        }

        // Users
        for (const u of users) {
            if (u._id === currentUser?._id) continue;
            items.push({
                id: u._id,
                name: u.name,
                type: 'user' as const,
                lastMessageTime: u.last_message_time,
                lastMessage: u.last_message,
                unreadCount: u.unread_count || 0,
                isOnline: onlineUsers.has(u._id),
                obj: u
            });
        }

        // Sort by time
        items.sort((a, b) => {
            const tA = new Date(a.lastMessageTime || 0).getTime();
            const tB = new Date(b.lastMessageTime || 0).getTime();
            return tB - tA;
        });

        return items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, groups, onlineUsers, searchTerm, currentUser]);

    return (
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                        {currentUser?.name[0]}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">{currentUser?.name}</h3>
                        <p className="text-xs text-green-500 font-medium flex items-center">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                            Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 border-b border-gray-50">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-xl">Chats</h2>
                    <div className="flex items-center space-x-2">
                        <button onClick={onCreateGroup} className="text-gray-400 hover:text-blue-500 transition-colors" title="Create Group">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        </button>
                        <button onClick={onOpenSettings} className="text-gray-400 hover:text-gray-600 transition-colors" title="Settings">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </button>
                        <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-600 placeholder-gray-400" />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {displayItems.length === 0 && <div className="text-center text-gray-400 text-sm mt-4">No chats found</div>}

                {displayItems.map(item => (
                    <div key={item.id} onClick={() => onSelect(item.id, item.type === 'group')}
                        className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${selectedId === item.id ? 'bg-blue-50/80 ring-1 ring-blue-100' : 'hover:bg-gray-50'}`}>

                        <div className="relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg 
                                ${item.type === 'group' ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                                {item.name[0]}
                            </div>
                            {item.type === 'user' && (
                                <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${item.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className={`font-semibold text-sm truncate ${selectedId === item.id ? 'text-blue-900' : 'text-gray-900'}`}>{item.name}</h4>
                                {item.lastMessageTime && <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <div className="flex justify-between items-center">
                                <p className={`text-sm truncate ${item.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                    {item.lastMessage ? (item.lastMessage.length > 25 ? item.lastMessage.substring(0, 25) + "..." : item.lastMessage) : <span className="italic">No messages yet</span>}
                                </p>
                                {item.unreadCount > 0 && <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full">{item.unreadCount}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
