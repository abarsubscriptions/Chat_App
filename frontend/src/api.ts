export const API_BASE = import.meta.env.VITE_API_URL || "";

export const getAuthHeader = () => {
    const token = localStorage.getItem("access_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
};

export const api = {
    async login(username: string, password: string) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        const res = await fetch(`${API_BASE}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json();
    },

    async register(name: string, email: string, password: string) {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Registration failed');
        }
        return res.json();
    },

    async getMe() {
        const res = await fetch(`${API_BASE}/users/me`, { headers: getAuthHeader() as HeadersInit });
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
    },

    async getUsers() {
        const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeader() as HeadersInit });
        return res.json();
    },

    async getGroups() {
        const res = await fetch(`${API_BASE}/groups`, { headers: getAuthHeader() as HeadersInit });
        return res.json();
    },

    async createGroup(name: string, members: string[], createdBy: string) {
        const res = await fetch(`${API_BASE}/groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            } as HeadersInit,
            body: JSON.stringify({ name, members, created_by: createdBy })
        });
        return res.json();
    },

    async addGroupMember(groupId: string, userId: string) {
        const res = await fetch(`${API_BASE}/groups/${groupId}/members`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            } as HeadersInit,
            body: JSON.stringify({ members: [userId] })
        });
        return res.json();
    },

    async deleteGroup(groupId: string) {
        const res = await fetch(`${API_BASE}/groups/${groupId}`, {
            method: 'DELETE',
            headers: getAuthHeader() as HeadersInit
        });
        if (!res.ok) throw new Error('Failed to delete group');
    },

    async getGroupMessages(groupId: string) {
        const res = await fetch(`${API_BASE}/messages/group/${groupId}`, { headers: getAuthHeader() as HeadersInit });
        return res.json();
    },

    async getPrivateMessages(otherUserId: string) {
        const res = await fetch(`${API_BASE}/messages/${otherUserId}`, { headers: getAuthHeader() as HeadersInit });
        return res.json();
    },

    async markRead(id: string) {
        await fetch(`${API_BASE}/conversations/read/${id}`, {
            method: 'POST',
            headers: getAuthHeader() as HeadersInit
        });
    }
};
