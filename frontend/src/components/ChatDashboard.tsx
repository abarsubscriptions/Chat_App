import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
import type { User, Group, Message, Settings } from '../types';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { SettingsModal } from './modals/SettingsModal';
import { CreateGroupModal } from './modals/CreateGroupModal';
import { GroupDetailsModal } from './modals/GroupDetailsModal';

export const ChatDashboard: React.FC = () => {
    const { user: currentUser, token } = useAuth();

    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    // Selection State
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isGroup, setIsGroup] = useState(false);

    // Messages State
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set()); // For simple typing indicator

    // Modals State
    const [showSettings, setShowSettings] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showGroupDetails, setShowGroupDetails] = useState(false);

    // Settings State
    const [settings, setSettings] = useState<Settings>(() => {
        const saved = localStorage.getItem("chat_settings");
        return saved ? JSON.parse(saved) : { sound: true, push: false };
    });

    const wsRef = useRef<WebSocket | null>(null);

    // Initial Fetch
    const fetchData = async () => {
        try {
            const [u, g] = await Promise.all([api.getUsers(), api.getGroups()]);
            setUsers(u);
            setGroups(g);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // WebSocket Logic
    const connectWS = useCallback(() => {
        if (wsRef.current) return;

        const baseUrl = import.meta.env.VITE_WS_URL ||
            (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;

        // Ensure we handle trailing slash if present in env
        const wsBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const wsUrl = `${wsBase}/ws?token=${token}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => console.log("Connected to WS");
        ws.onmessage = (event) => handleWSMessage(JSON.parse(event.data));
        ws.onclose = () => {
            console.log("WS Disconnected");
            wsRef.current = null;
            setTimeout(connectWS, 3000);
        };
        ws.onerror = (error) => {
            console.error("WS Error:", error);
        };
    }, [token]); // Only recreate if token changes

    useEffect(() => {
        connectWS();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connectWS]); // Depend on connectWS instead of token

    // Typing State
    const typingTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

    const handleWSMessage = (data: any) => {
        if (data.type === "online_users") {
            setOnlineUsers(new Set(data.users));
        } else if (data.type === "status") {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                if (data.status === "online") next.add(data.user_id);
                else next.delete(data.user_id);
                return next;
            });
            // Update last seen in user list locally
            setUsers(prev => prev.map(u => u._id === data.user_id ? { ...u, last_seen: data.last_seen } : u));
        } else if (data.type === "typing") {
            // Handle typing
            const senderId = data.sender_id;
            let isRelevant = false;

            if (isGroup && data.is_group && data.group_id === selectedId) {
                isRelevant = true;
            } else if (!isGroup && !data.is_group && senderId === selectedId) {
                isRelevant = true;
            }

            if (isRelevant) {
                setTypingUsers(prev => {
                    const next = new Set(prev);
                    next.add(senderId);
                    return next;
                });

                // Clear timeout if exists
                if (typingTimeouts.current[senderId]) {
                    clearTimeout(typingTimeouts.current[senderId]);
                }

                // Set new timeout
                typingTimeouts.current[senderId] = setTimeout(() => {
                    setTypingUsers(prev => {
                        const next = new Set(prev);
                        next.delete(senderId);
                        return next;
                    });
                    delete typingTimeouts.current[senderId];
                }, 3000);
            }

        } else if (data.type === "message" || !data.type) {
            handleNewMessage(data);
            // Clear typing instantly if message received
            if (data.sender_id && typingTimeouts.current[data.sender_id]) {
                clearTimeout(typingTimeouts.current[data.sender_id]);
                setTypingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(data.sender_id);
                    return next;
                });
            }
        }
    };

    const handleNewMessage = (msg: Message) => {
        console.log("📨 New message received:", msg);
        console.log("Current state:", { selectedId, isGroup, currentUserId: currentUser?._id });

        // 1. Update Messages if current chat
        let isCurrent = false;

        if (msg.is_group && isGroup && msg.group_id === selectedId) {
            // Group message in current group chat
            console.log("✅ Group message in current chat");
            isCurrent = true;
        } else if (!msg.is_group && !isGroup && selectedId) {
            // Private message - check if it's part of the conversation with selectedId
            // Either: incoming from selectedId OR outgoing to selectedId
            if (msg.sender_id === selectedId && msg.recipient_id === currentUser?._id) {
                // Incoming message from the selected user
                console.log("✅ Incoming message from selected user");
                isCurrent = true;
            } else if (msg.sender_id === currentUser?._id && msg.recipient_id === selectedId) {
                // Outgoing message to the selected user (echo from server)
                console.log("✅ Outgoing message to selected user (echo)");
                isCurrent = true;
            } else {
                console.log("❌ Message doesn't match current chat", {
                    msgSenderId: msg.sender_id,
                    msgRecipientId: msg.recipient_id,
                    selectedId,
                    currentUserId: currentUser?._id
                });
            }
        }

        if (isCurrent) {
            console.log("Adding message to chat screen");
            // Check for duplicates (in case we already added it optimistically)
            setMessages(prev => {
                const isDuplicate = prev.some(m =>
                    m.sender_id === msg.sender_id &&
                    m.content === msg.content &&
                    Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 2000 // Within 2 seconds
                );
                if (isDuplicate) {
                    console.log("Duplicate message detected, skipping");
                    return prev;
                }
                return [...prev, msg];
            });
        } else {
            console.log("Message not for current chat, showing notification");
            // Notification logic here
            if (settings.sound) {
                const audio = new Audio("https://cdn.pixabay.com/download/audio/2022/03/24/audio_34d1197946.mp3?filename=notification-sound-7062.mp3");
                audio.play().catch(e => { });
            }
            if (settings.push && document.hidden) {
                new Notification("New Message", { body: msg.content });
            }
        }

        // 2. Update Sidebar (List reordering & unread)
        // Re-fetch or update local state. For simplicity, we can refetch lightly or update state manually.
        // Let's refetch to be safe and consistent
        fetchData();
    };

    // Chat Selection
    const handleSelectChat = async (id: string, group: boolean) => {
        setSelectedId(id);
        setIsGroup(group);
        setMessages([]); // Clear previous

        try {
            if (group) {
                const msgs = await api.getGroupMessages(id);
                setMessages(msgs);
            } else {
                const msgs = await api.getPrivateMessages(id);
                setMessages(msgs);
            }
            await api.markRead(id);
            // Update unread count locally instantly
            if (group) {
                setGroups(prev => prev.map(g => g._id === id ? { ...g, unread_count: 0 } : g));
            } else {
                setUsers(prev => prev.map(u => u._id === id ? { ...u, unread_count: 0 } : u));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendMessage = (content: string) => {
        if (!wsRef.current || !selectedId) return;

        // Optimistic update: Add message to UI immediately
        const optimisticMessage: Message = {
            sender_id: currentUser?._id || '',
            recipient_id: isGroup ? selectedId : selectedId,
            group_id: isGroup ? selectedId : undefined,
            content,
            timestamp: new Date().toISOString(),
            is_group: isGroup
        };

        setMessages(prev => [...prev, optimisticMessage]);

        // Send via WebSocket
        const msg = {
            type: "message",
            content,
            recipient_id: selectedId,
            is_group: isGroup
        };
        wsRef.current.send(JSON.stringify(msg));
    };

    // Computed Props
    const userMap = useMemo(() => {
        const map: { [key: string]: string } = { [currentUser?._id || '']: 'You' };
        users.forEach(u => map[u._id] = u.name);
        return map;
    }, [users, currentUser]);

    const activeChatName = useMemo(() => {
        if (!selectedId) return "";
        if (isGroup) return groups.find(g => g._id === selectedId)?.name || "Group";
        return users.find(u => u._id === selectedId)?.name || "User";
    }, [selectedId, isGroup, groups, users]);


    const activeChatStatus = useMemo(() => {
        if (!selectedId) return "";
        if (isGroup) {
            // Check if anyone in group is typing (except me)
            const typers = Array.from(typingUsers).filter(uid => {
                const member = groups.find(g => g._id === selectedId)?.members.includes(uid);
                return member && uid !== currentUser?._id;
            });
            if (typers.length > 0) {
                const names = typers.map(uid => users.find(u => u._id === uid)?.name).join(", ");
                return `${names} is typing...`;
            }
            return ""; // Or group member count
        }

        // Direct Message
        if (typingUsers.has(selectedId)) return "Typing...";

        if (onlineUsers.has(selectedId)) return "Online";
        const u = users.find(user => user._id === selectedId);
        if (u?.last_seen) return `Last seen: ${new Date(u.last_seen).toLocaleString()}`;
        return "Offline";
    }, [selectedId, isGroup, onlineUsers, users, typingUsers, groups]);

    const activeGroup = useMemo(() => {
        if (!isGroup || !selectedId) return null;
        return groups.find(g => g._id === selectedId) || null;
    }, [isGroup, selectedId, groups]);


    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar
                users={users}
                groups={groups}
                onlineUsers={onlineUsers}
                selectedId={selectedId}
                onSelect={handleSelectChat}
                onCreateGroup={() => setShowCreateGroup(true)}
                onOpenSettings={() => setShowSettings(true)}
            />

            <ChatArea
                selectedId={selectedId}
                chatName={activeChatName}
                chatStatus={activeChatStatus}
                isGroup={isGroup}
                messages={messages}
                userMap={userMap}
                onSendMessage={handleSendMessage}
                onOpenGroupDetails={() => setShowGroupDetails(true)}
            />

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onSave={(s) => {
                    setSettings(s);
                    localStorage.setItem("chat_settings", JSON.stringify(s));
                }}
            />

            <CreateGroupModal
                isOpen={showCreateGroup}
                onClose={() => setShowCreateGroup(false)}
                users={users}
                onGroupCreated={fetchData}
            />

            {activeGroup && showGroupDetails && (
                <GroupDetailsModal
                    isOpen={showGroupDetails}
                    onClose={() => setShowGroupDetails(false)}
                    group={activeGroup}
                    allUsers={users}
                    userMap={userMap}
                    onUpdate={fetchData}
                    onDelete={() => {
                        setSelectedId(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};
