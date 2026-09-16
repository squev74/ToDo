import React from 'react';
import { Lock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccessDeniedProps {
  onLogout?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onLogout }) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  return (
    <div
      id="access-denied-container"
      className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4"
    >
      <div
        id="access-denied-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center"
      >
        <div
          id="access-denied-icon-container"
          className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6"
        >
          <Lock className="w-8 h-8" />
        </div>

        <h1
          id="access-denied-title"
          className="text-2xl font-bold text-slate-900 mb-3"
        >
          Vous n'avez pas accès.
        </h1>

        <p
          id="access-denied-description"
          className="text-sm text-slate-600 mb-8 leading-relaxed"
        >
          Votre compte est en attente d'approbation ou a été désactivé par un administrateur.
          Veuillez contacter le support ou réessayer plus tard.
        </p>

        <button
          id="btn-access-denied-logout"
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};
