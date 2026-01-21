import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
    const { login } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegister) {
                await api.register(name, email, password);
                alert("Registration successful! Please login.");
                setIsRegister(false);
                setPassword('');
            } else {
                const data = await api.login(email, password);
                login(data.access_token);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        }
    };

    return (
        <div className="h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="w-full md:w-[480px] bg-white p-8 md:p-12 flex flex-col justify-center relative z-10 transition-all duration-500 ease-in-out shadow-xl rounded-2xl">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        {isRegister ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className="text-gray-500">
                        {isRegister ? 'Join the community today.' : 'Enter your details to access your account.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <div className="text-red-500 text-sm">{error}</div>}

                    {isRegister && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required
                                className="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="John Doe" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                            className="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="you@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                            className="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="••••••••" />
                    </div>

                    <button type="submit"
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                        {isRegister ? 'Create Account' : 'Sign In'}
                    </button>

                    <div className="text-center text-sm text-gray-500">
                        {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                        <button type="button" onClick={() => setIsRegister(!isRegister)}
                            className="text-blue-600 font-semibold hover:underline">
                            {isRegister ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
