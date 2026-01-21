export interface User {
    _id: string;
    name: string;
    email: string;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
    last_seen?: string;
    status?: 'online' | 'offline';
}

export interface Group {
    _id: string;
    name: string;
    members: string[]; // user IDs
    created_by: string;
    created_at: string;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
}

export interface Message {
    _id?: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    timestamp: string;
    is_group: boolean;
    group_id?: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

export interface Settings {
    sound: boolean;
    push: boolean;
}

export interface ChatItem {
    id: string;
    name: string; // User name or Group name
    type: 'user' | 'group';
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount: number;
    avatar?: string; // Initial
    isOnline?: boolean;
    lastSeen?: string;
    raw?: User | Group; // Keep original object reference
}
