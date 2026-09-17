import React, { useState } from 'react';
import {
  CheckSquare,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Cloud,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Globe,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useAuth, getFriendlyAuthErrorMessage } from '../context/AuthContext';
import firebaseConfig from '../../firebase-applet-config.json';

export const AuthScreen: React.FC = () => {
  const {
    login,
    signup,
    loginWithGoogle,
    loginAnonymously,
    loginWithLocalSession,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState<boolean>(false);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState<boolean>(false);
  const [domainCopied, setDomainCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState<boolean>(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState<boolean>(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsOperationNotAllowed(false);
    setIsUnauthorizedDomain(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Veuillez renseigner votre adresse e-mail et votre mot de passe.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signup(trimmedEmail, password);
      } else {
        await login(trimmedEmail, password);
      }
    } catch (err: unknown) {
      console.error('Erreur Firebase Auth:', err);
      const firebaseError = err as { code?: string; message?: string };
      const code = firebaseError.code || '';

      if (code === 'auth/operation-not-allowed') {
        setIsOperationNotAllowed(true);
        setErrorMsg(getFriendlyAuthErrorMessage(code));
      } else if (code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
        setErrorMsg(getFriendlyAuthErrorMessage(code));
      } else {
        const friendlyMessage = code
          ? getFriendlyAuthErrorMessage(code)
          : 'Impossible de se connecter. Veuillez vérifier vos identifiants.';
        setErrorMsg(friendlyMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsOperationNotAllowed(false);
    setIsUnauthorizedDomain(false);
    setIsGoogleSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.error('Erreur Google Sign-in:', err);
      const firebaseError = err as { code?: string };
      const code = firebaseError.code || '';
      if (code === 'auth/operation-not-allowed') {
        setIsOperationNotAllowed(true);
        setErrorMsg("L'authentification Google n'est pas encore activée dans la console Firebase. Vous pouvez utiliser l'accès direct.");
      } else if (code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
        setErrorMsg(getFriendlyAuthErrorMessage(code));
      } else if (code !== 'auth/popup-closed-by-user') {
        setErrorMsg(getFriendlyAuthErrorMessage(code));
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleGuestSignIn = async () => {
    setErrorMsg(null);
    setIsGuestSubmitting(true);
    try {
      await loginAnonymously();
    } catch (err: unknown) {
      console.warn('Firebase Anonymous non configuré, bascule vers session locale instantanée:', err);
      // Fallback automatique transparent pour que l'utilisateur ne soit jamais bloqué
      loginWithLocalSession('invite@demo.fr');
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleDirectAccessWithCurrentEmail = () => {
    loginWithLocalSession(email.trim() || 'utilisateur@demo.fr');
  };

  return (
    <div
      id="auth-screen-container"
      className="min-h-screen bg-[#F9F8F6] flex flex-col justify-center py-10 sm:px-6 lg:px-8"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo & Titre */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6B8E78] text-white shadow-[0_4px_20px_rgba(107,142,120,0.2)]">
            <CheckSquare className="h-7 w-7" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-light tracking-wide text-[#1A1D1A]">
          Gestionnaire de Tâches
        </h1>
        <p className="mt-2 text-center text-xs text-[#737873] font-light px-4">
          Un espace épuré pour organiser votre quotidien avec sérénité
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-[#F0EFEB] bg-white p-7 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
          {/* Boutons d'accès direct et Google */}
          <div className="space-y-2.5 mb-6">
            <button
              id="auth-guest-btn"
              type="button"
              onClick={handleGuestSignIn}
              disabled={isGuestSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1A1D1A] hover:bg-[#2D312D] text-white py-2.5 px-4 text-xs font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors"
            >
              {isGuestSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 text-[#C89B7B]" />
              )}
              <span>Accès immédiat (Mode Démo)</span>
            </button>

            <button
              id="auth-google-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#F0EFEB] bg-white hover:bg-[#F9F8F6] text-[#1A1D1A] py-2.5 px-4 text-xs font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors"
            >
              {isGoogleSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 10.02 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>Continuer avec Google</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="w-full border-t border-[#F0EFEB]" />
            <span className="bg-white px-3 text-[11px] font-medium text-[#737873] uppercase tracking-wider absolute">
              ou avec e-mail
            </span>
          </div>

          {/* Onglets Connexion / Inscription */}
          <div className="flex rounded-xl bg-[#F9F8F6] p-1 mb-5 border border-[#F0EFEB]">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
                setIsOperationNotAllowed(false);
                setIsUnauthorizedDomain(false);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                !isSignUp
                  ? 'bg-white text-[#1A1D1A] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#F0EFEB]'
                  : 'text-[#737873] hover:text-[#1A1D1A]'
              }`}
            >
              Se connecter
            </button>
            <button
              id="tab-signup-btn"
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg(null);
                setIsOperationNotAllowed(false);
                setIsUnauthorizedDomain(false);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                isSignUp
                  ? 'bg-white text-[#1A1D1A] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#F0EFEB]'
                  : 'text-[#737873] hover:text-[#1A1D1A]'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {/* Message d'erreur & Action de secours */}
          {errorMsg && (
            <div
              id="auth-error-banner"
              className="mb-5 rounded-xl border border-[#C89B7B]/30 bg-[#C89B7B]/10 p-3.5 text-xs text-[#966847]"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#C89B7B] mt-0.5" />
                <div className="flex-1 space-y-2">
                  <span className="font-medium leading-relaxed block">{errorMsg}</span>

                  {/* Guide spécifique pour auth/unauthorized-domain */}
                  {isUnauthorizedDomain && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#C89B7B]/20 space-y-3">
                      <div className="rounded-xl bg-white p-2.5 border border-[#F0EFEB] text-[#1A1D1A] space-y-1.5">
                        <div className="text-[11px] font-medium text-[#1A1D1A] flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-[#6B8E78]" />
                          <span>Domaine à autoriser dans Firebase :</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#F9F8F6] rounded-lg p-1.5 border border-[#F0EFEB]">
                          <code className="text-[11px] font-mono font-medium text-[#6B8E78] flex-1 truncate select-all">
                            {currentHostname || 'votre-domaine.github.io'}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyHostname}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-[#F0EFEB] border border-[#F0EFEB] text-[10px] font-medium text-[#1A1D1A] transition-colors shrink-0"
                            title="Copier le domaine"
                          >
                            {domainCopied ? (
                              <>
                                <Check className="h-3 w-3 text-[#6B8E78]" />
                                <span className="text-[#6B8E78]">Copié !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-[#737873]" />
                                <span>Copier</span>
                              </>
                            )}
                          </button>
                        </div>
                        <ol className="list-decimal list-inside text-[11px] text-[#737873] space-y-1 pt-1 font-light">
                          <li>
                            Ouvrez la{' '}
                            <a
                              href={`https://console.firebase.google.com/project/${firebaseConfig.projectId || 'mongestionnairetaches-379fb'}/authentication/settings`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[#6B8E78] hover:underline inline-flex items-center gap-0.5"
                            >
                              Console Firebase (Paramètres Auth)
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </li>
                          <li>Allez dans l'onglet <strong>Domaines autorisés</strong></li>
                          <li>Cliquez sur <strong>Ajouter un domaine</strong>, collez ce domaine et enregistrez.</li>
                        </ol>
                      </div>

                      {/* Solution immédiate sans attente */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => loginWithLocalSession('invite@demo.fr')}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A1D1A] hover:bg-[#2D312D] text-white px-3 py-1.5 font-medium text-[11px] transition-colors"
                        >
                          <Zap className="h-3.5 w-3.5 text-[#C89B7B]" />
                          <span>Accéder immédiatement (Mode Démo)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isOperationNotAllowed && !isUnauthorizedDomain && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleDirectAccessWithCurrentEmail}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#6B8E78] hover:bg-[#5d7c68] text-white px-3 py-1.5 font-medium text-[11px] transition-colors"
                      >
                        <span>Entrer immédiatement avec cet e-mail</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="auth-email-input"
                className="block text-xs font-medium text-[#737873] uppercase tracking-wider mb-1.5"
              >
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737873]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="auth-email-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@domaine.com"
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white py-2.5 pl-9 pr-3 text-xs text-[#1A1D1A] placeholder:text-[#737873]/50 focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password-input"
                className="block text-xs font-medium text-[#737873] uppercase tracking-wider mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737873]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white py-2.5 pl-9 pr-10 text-xs text-[#1A1D1A] placeholder:text-[#737873]/50 focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#737873] hover:text-[#1A1D1A] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#6B8E78] py-3 text-xs font-medium text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-[#5d7c68] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/20 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Veuillez patienter...</span>
                </>
              ) : isSignUp ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Créer mon compte</span>
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4" />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>

          {/* Avantages Cloud */}
          <div className="mt-6 pt-5 border-t border-[#F0EFEB]">
            <div className="flex items-center gap-2 text-[11px] text-[#737873] font-light">
              <ShieldCheck className="h-4 w-4 text-[#6B8E78] shrink-0" />
              <span>Base Firestore sécurisée par utilisateur • Sauvegarde instantanée</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
