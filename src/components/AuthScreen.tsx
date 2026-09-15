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
      className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo & Titre */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <CheckSquare className="h-8 w-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-black tracking-tight text-slate-900">
          Gestionnaire de Tâches
        </h1>
        <p className="mt-2 text-center text-xs text-slate-600 px-4">
          Synchronisation cloud temps réel et accès sécurisé multi-appareils (Firebase Firestore).
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          {/* Boutons d'accès direct et Google */}
          <div className="space-y-2.5 mb-6">
            <button
              id="auth-guest-btn"
              type="button"
              onClick={handleGuestSignIn}
              disabled={isGuestSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 text-xs font-bold shadow-xs transition-colors"
            >
              {isGuestSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 text-amber-400" />
              )}
              <span>Accès immédiat (Mode Démo / Sans configuration)</span>
            </button>

            <button
              id="auth-google-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 px-4 text-xs font-semibold shadow-2xs transition-colors"
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
            <div className="w-full border-t border-slate-200" />
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider absolute">
              ou avec e-mail
            </span>
          </div>

          {/* Onglets Connexion / Inscription */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
                setIsOperationNotAllowed(false);
                setIsUnauthorizedDomain(false);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                !isSignUp
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                isSignUp
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {/* Message d'erreur & Action de secours */}
          {errorMsg && (
            <div
              id="auth-error-banner"
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <span className="font-medium leading-relaxed block">{errorMsg}</span>

                  {/* Guide spécifique pour auth/unauthorized-domain */}
                  {isUnauthorizedDomain && (
                    <div className="mt-2.5 pt-2.5 border-t border-rose-200/80 space-y-3">
                      <div className="rounded-lg bg-white/90 p-2.5 border border-rose-100 text-slate-700 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Domaine à autoriser dans Firebase :</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-md p-1.5 border border-slate-200">
                          <code className="text-[11px] font-mono font-bold text-indigo-700 flex-1 truncate select-all">
                            {currentHostname || 'votre-domaine.github.io'}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyHostname}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 shadow-2xs transition-colors shrink-0"
                            title="Copier le domaine"
                          >
                            {domainCopied ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-700">Copié !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-slate-500" />
                                <span>Copier</span>
                              </>
                            )}
                          </button>
                        </div>
                        <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1 pt-1">
                          <li>
                            Ouvrez la{' '}
                            <a
                              href={`https://console.firebase.google.com/project/${firebaseConfig.projectId || 'mongestionnairetaches-379fb'}/authentication/settings`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5"
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
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 font-bold text-[11px] shadow-xs transition-colors"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 font-bold text-[11px] shadow-xs transition-colors"
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
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
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
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition-colors"
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
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Base Firestore sécurisée par utilisateur • Sauvegarde instantanée</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
