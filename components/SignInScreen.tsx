
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/storage';

interface SignInScreenProps {
  initialMode: 'sign-in' | 'register';
  onSuccess: (user: User) => void;
  onBack: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  initialMode,
  onSuccess,
  onBack
}) => {
  const [mode, setMode] = useState<'sign-in' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Hardcode demo credentials on localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: isLocalhost ? 'demo@groundsync.com' : '',
    password: isLocalhost ? 'password123' : '',
    role: UserRole.BAULEITER
  });

  const isValidEmail = (email: string) => email.includes('@');
  const isValidPassword = (password: string) => password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!isValidPassword(formData.password)) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (mode === 'register') {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('Please enter your first name and last name');
        return;
      }
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'sign-in') {
        result = await db.authenticate(formData.email, formData.password);
      } else {
        result = await db.register(
          formData.firstName,
          formData.lastName,
          formData.email,
          formData.password,
          formData.role
        );
      }

      if (result.success && result.user) {
        onSuccess(result.user);
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xl"></i>
          </button>
          <h2 className="text-xl font-black text-slate-900">
            {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </h2>
          <div className="w-6"></div> {/* Spacer for centering */}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b bg-slate-50">
          <button
            onClick={() => { setMode('sign-in'); setError(null); }}
            className={`flex-1 py-4 font-bold transition-all ${
              mode === 'sign-in'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-4 font-bold transition-all ${
              mode === 'register'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="John"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Doe"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="user@groundsync.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full border rounded-xl p-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                disabled={loading}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={loading}
              >
                {Object.values(UserRole).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all ${
              loading
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                {mode === 'sign-in' ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              mode === 'sign-in' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
