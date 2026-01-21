import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Message, User } from '../types';

interface ChatAreaProps {
    selectedId: string | null;
    chatName: string;
    chatStatus: string; // "Online", "Last seen...", "Typing..."
    isGroup: boolean;
    messages: Message[];
    onSendMessage: (content: string) => void;
    onOpenGroupDetails: () => void;
    userMap: { [key: string]: string }; // id -> name for group messages
}

export const ChatArea: React.FC<ChatAreaProps> = ({
    selectedId, chatName, chatStatus, isGroup, messages, onSendMessage, onOpenGroupDetails, userMap
}) => {
    const { user: currentUser } = useAuth();
    const [msgInput, setMsgInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Scroll to bottom when selecting a new chat
    useEffect(() => {
        if (selectedId) {
            // Use setTimeout to ensure messages are rendered first
            setTimeout(scrollToBottom, 100);
        }
    }, [selectedId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgInput.trim()) return;
        onSendMessage(msgInput);
        setMsgInput("");
    };

    if (!selectedId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </div>
                <p>Select a chat to start messaging</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 h-full relative">
            {/* Header */}
            <div className="h-16 bg-white border-b border-gray-100 flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                        {chatName[0]}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{chatName}</h3>
                        <p className={`text-xs ${chatStatus.includes('Online') ? 'text-green-500 font-medium' : chatStatus.includes('Typing') ? 'text-blue-500 font-bold' : 'text-gray-500'}`}>
                            {chatStatus}
                        </p>
                    </div>
                </div>
                {isGroup && (
                    <button onClick={onOpenGroupDetails} className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-50">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((m, i) => {
                    const isMe = m.sender_id === currentUser?._id;
                    return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`message-bubble ${isMe ? 'message-me' : 'message-other'}`}>
                                {!isMe && isGroup && (
                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase">
                                        {userMap[m.sender_id] || 'Unknown'}
                                    </p>
                                )}
                                <p>{m.content}</p>
                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {new Date(m.timestamp + (m.timestamp.endsWith("Z") ? "" : "Z")).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                    <input type="text" value={msgInput} onChange={e => setMsgInput(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-100 outline-none text-gray-700 placeholder-gray-400"
                        placeholder="Type your message..." />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};
