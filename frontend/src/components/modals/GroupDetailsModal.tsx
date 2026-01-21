import React, { useState } from 'react';
import type { Group, User } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface GroupDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
    allUsers: User[];
    onUpdate: () => void;
    onDelete: () => void;
    userMap: { [key: string]: string };
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
    isOpen, onClose, group, allUsers, onUpdate, onDelete, userMap
}) => {
    const { user: currentUser } = useAuth();
    const [selectedUserToAdd, setSelectedUserToAdd] = useState("");

    const handleAddMember = async () => {
        if (!selectedUserToAdd) return;
        try {
            await api.addGroupMember(group._id, selectedUserToAdd);
            setSelectedUserToAdd("");
            onUpdate();
        } catch (e) {
            alert("Failed to add member");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await api.deleteGroup(group._id);
            onDelete();
        } catch (e) {
            alert("Failed to delete group");
        }
    };

    if (!isOpen) return null;

    const availableUsers = allUsers.filter(u => !group.members.includes(u._id));

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{group.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Members</h3>
                        <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-2">
                            {group.members.map(mid => (
                                <div key={mid} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                                    <span className="font-medium text-gray-700">{userMap[mid] || 'Unknown'}</span>
                                    {mid === group.created_by && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Owner</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Add Member</h3>
                        <div className="flex space-x-2">
                            <select value={selectedUserToAdd} onChange={e => setSelectedUserToAdd(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select user...</option>
                                {availableUsers.map(u => (
                                    <option key={u._id} value={u._id}>{u.name}</option>
                                ))}
                            </select>
                            <button onClick={handleAddMember} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">Add</button>
                        </div>
                    </div>

                    {currentUser?._id === group.created_by && (
                        <div className="pt-4 border-t border-gray-100">
                            <button onClick={handleDelete} className="w-full py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
                                Delete Group
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
