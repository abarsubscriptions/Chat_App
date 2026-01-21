import React, { useState } from 'react';
import type { User } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    onGroupCreated: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, users, onGroupCreated }) => {
    const { user: currentUser } = useAuth();
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    const toggleMember = (id: string) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter(m => m !== id));
        } else {
            setSelectedMembers([...selectedMembers, id]);
        }
    };

    const handleCreate = async () => {
        if (!groupName || !currentUser) return;
        try {
            await api.createGroup(groupName, [...selectedMembers, currentUser._id], currentUser._id);
            setGroupName("");
            setSelectedMembers([]);
            onGroupCreated();
            onClose();
        } catch (e) {
            alert("Failed to create group");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md p-6 rounded-2xl">
                <h2 className="text-xl font-bold mb-4">Create Group Chat</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                        <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Project Team" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Members</label>
                        <div className="h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                            {users.map(u => {
                                if (u._id === currentUser?._id) return null;
                                return (
                                    <div key={u._id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg">
                                        <input type="checkbox"
                                            checked={selectedMembers.includes(u._id)}
                                            onChange={() => toggleMember(u._id)}
                                            className="w-4 h-4 text-blue-600 rounded" />
                                        <span className="text-sm text-gray-700">{u.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex space-x-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                        <button onClick={handleCreate} className="flex-1 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30">Create</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
