
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
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100 overflow-y-auto">
      {/* Navigation Bar */}
      <nav className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-lg">
            <i className="fa-solid fa-map-location-dot text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Groundsync
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="bg-white border-2 border-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl shadow-sm hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={onRegister}
            className="bg-blue-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg hover:bg-blue-700 transition-all"
          >
            Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
            Construction Decisions,
            <br />
            <span className="text-blue-600">Documented Right</span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-3xl mx-auto mb-12">
            Pin decisions directly on your 2D PDF plans. Record voice notes, capture photos, and keep everyone on the same page with role-based project management.
          </p>
          <button
            onClick={onRegister}
            className="bg-blue-600 text-white font-bold py-5 px-10 rounded-2xl shadow-2xl hover:bg-blue-700 transition-all text-lg hover:scale-105 active:scale-95"
          >
            Get Started Free
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white border-2 border-slate-100 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-location-dot text-2xl text-blue-600"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Geo-Located Pins</h3>
            <p className="text-slate-600">
              Click anywhere on your PDF plans to pin decisions exactly where they matter. Visual context at a glance.
            </p>
          </div>

          <div className="bg-white border-2 border-slate-100 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-microphone text-2xl text-blue-600"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Voice Notes</h3>
            <p className="text-slate-600">
              Record decisions on-site with voice transcription powered by AI. No typing required.
            </p>
          </div>

          <div className="bg-white border-2 border-slate-100 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-users text-2xl text-blue-600"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Role-Based Access</h3>
            <p className="text-slate-600">
              Manage permissions for Bauleiter, Project Managers, Architects, and more. Everyone stays in sync.
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-12 text-center text-white shadow-2xl">
          <h3 className="text-3xl font-black mb-4">Built for Construction Professionals</h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Track HOAI phases, categorize decisions, capture photos, and maintain full revision history. Everything you need in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-bold">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-check-circle text-blue-200"></i>
              <span>PDF Plan Support</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-check-circle text-blue-200"></i>
              <span>Photo Documentation</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-check-circle text-blue-200"></i>
              <span>Comment Threads</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-check-circle text-blue-200"></i>
              <span>Change History</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-slate-500 text-sm">
        <p className="font-medium">Groundsync - Construction Decision Documentation</p>
      </footer>
    </div>
  );
};
