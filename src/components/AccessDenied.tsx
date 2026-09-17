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
      className="min-h-screen w-full bg-[#F9F8F6] flex items-center justify-center p-4"
    >
      <div
        id="access-denied-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] p-8 text-center"
      >
        <div
          id="access-denied-icon-container"
          className="mx-auto w-14 h-14 bg-[#C89B7B]/10 text-[#C89B7B] rounded-2xl flex items-center justify-center mb-6 border border-[#C89B7B]/20"
        >
          <Lock className="w-7 h-7" />
        </div>

        <h1
          id="access-denied-title"
          className="text-2xl font-light tracking-wide text-[#1A1D1A] mb-3"
        >
          Accès restreint
        </h1>

        <p
          id="access-denied-description"
          className="text-xs text-[#737873] mb-8 leading-relaxed font-light"
        >
          Votre compte est en attente d'approbation ou a été désactivé par un administrateur.
          Veuillez contacter le support ou réessayer ultérieurement.
        </p>

        <button
          id="btn-access-denied-logout"
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1A1D1A] hover:bg-[#2D312D] text-white font-medium text-xs transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};
