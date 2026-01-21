import React, { useEffect, useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: { sound: boolean; push: boolean };
    onSave: (settings: { sound: boolean; push: boolean }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [sound, setSound] = useState(settings.sound);
    const [push, setPush] = useState(settings.push);

    useEffect(() => {
        setSound(settings.sound);
        setPush(settings.push);
    }, [settings, isOpen]);

    const handleToggleSound = (checked: boolean) => {
        setSound(checked);
        onSave({ ...settings, sound: checked, push });
    };

    const handleTogglePush = async (checked: boolean) => {
        if (checked) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setPush(true);
                onSave({ ...settings, sound, push: true });
            } else {
                setPush(false); // Denied
                onSave({ ...settings, sound, push: false });
            }
        } else {
            setPush(false);
            onSave({ ...settings, sound, push: false });
        }
    };

    const playTestSound = () => {
        const audio = new Audio("https://cdn.pixabay.com/download/audio/2022/03/24/audio_34d1197946.mp3?filename=notification-sound-7062.mp3");
        audio.play().catch(e => console.error(e));
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-sm p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-800">Notification Sounds</p>
                            <p className="text-xs text-gray-500">Play a sound for new messages</p>
                            <button onClick={playTestSound} className="text-xs text-blue-500 hover:text-blue-700 font-medium underline mt-1">Test Sound</button>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={sound} onChange={e => handleToggleSound(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-800">Push Notifications</p>
                            <p className="text-xs text-gray-500">Show desktop notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={push} onChange={e => handleTogglePush(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
