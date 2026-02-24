
import React from 'react';

interface AuthLandingScreenProps {
  onSignIn: () => void;
  onRegister: () => void;
}

export const AuthLandingScreen: React.FC<AuthLandingScreenProps> = ({
  onSignIn,
  onRegister
}) => {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-xl mb-6">
            <i className="fa-solid fa-map-location-dot text-4xl text-white"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
            Groundsync
          </h1>
          <p className="text-lg text-slate-600 font-medium">
            Construction decision documentation made simple
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onSignIn}
            className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
          >
            Sign In
          </button>
          <button
            onClick={onRegister}
            className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 px-6 rounded-2xl shadow-lg hover:border-blue-300 hover:text-blue-600 transition-all hover:scale-105 active:scale-95"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};
