import React, { useEffect, useState } from 'react';
import {
  Shield,
  UserCheck,
  UserX,
  Trash2,
  UserPlus,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  X,
  RefreshCw,
  Mail,
  Calendar,
  Activity,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserProfile, UserStatus } from '../types/auth';
import {
  subscribeToUsers,
  updateUserStatus,
  deleteUserAndData,
  createPreApprovedUser,
  testAdminPermissions,
  AdminDiagnosticResult,
} from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL, ADMIN_UID } from '../types';

interface AdminPanelProps {
  onBack?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');

  // Modal Ajout utilisateur
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Modal Confirmation Suppression
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Diagnostic Firebase & Permissions
  const [diagnostic, setDiagnostic] = useState<AdminDiagnosticResult | null>(null);
  const [isTestingDiag, setIsTestingDiag] = useState(false);
  const [isDiagOpen, setIsDiagOpen] = useState(true);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleRunDiagnostic = async () => {
    setIsTestingDiag(true);
    try {
      const res = await testAdminPermissions();
      setDiagnostic(res);
    } catch (err: any) {
      console.error('Erreur diagnostic :', err);
    } finally {
      setIsTestingDiag(false);
    }
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Vérification de sécurité stricte : réservé exclusivement à l'admin (Email ou UID exact)
  const isSuperAdmin =
    user &&
    (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      user.uid === ADMIN_UID ||
      user.role === 'admin');

  // Lancement automatique du diagnostic à l'ouverture pour feedback immédiat
  useEffect(() => {
    if (isSuperAdmin) {
      handleRunDiagnostic();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUsers(
      (userList) => {
        setUsers(userList);
        setLoading(false);
      },
      (err) => {
        console.warn('Erreur écoute utilisateurs admin :', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isSuperAdmin]);

  // Si l'utilisateur n'a pas les droits d'administration
  if (!isSuperAdmin) {
    return (
      <div
        id="admin-forbidden-container"
        className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
      >
        <div
          id="admin-forbidden-card"
          className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center"
        >
          <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Accès Refusé</h1>
          <p className="text-sm text-slate-600 mb-6">
            Ce panneau d'administration est réservé exclusivement à l'administrateur principal (
            <span className="font-mono text-slate-800">{ADMIN_EMAIL}</span>).
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à l'application</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Action : Approuver
  const handleApprove = async (targetUser: UserProfile) => {
    try {
      await updateUserStatus(targetUser.uid, 'approved');
      setFeedbackMessage({
        type: 'success',
        text: `Le compte ${targetUser.email} a été approuvé avec succès.`,
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error("Erreur lors de l'approbation :", err);
      setFeedbackMessage({
        type: 'error',
        text: "Erreur lors de l'approbation : " + (err.message || err),
      });
    }
  };

  // Action : Bloquer
  const handleBlock = async (targetUser: UserProfile) => {
    if (
      targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      targetUser.uid === ADMIN_UID
    ) {
      setFeedbackMessage({
        type: 'error',
        text: "Le compte de l'administrateur principal ne peut pas être bloqué.",
      });
      return;
    }
    try {
      await updateUserStatus(targetUser.uid, 'disabled');
      setFeedbackMessage({
        type: 'success',
        text: `Le compte ${targetUser.email} a été bloqué avec succès.`,
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error("Erreur lors du blocage :", err);
      setFeedbackMessage({
        type: 'error',
        text: "Erreur lors du blocage : " + (err.message || err),
      });
    }
  };

  // Action : Supprimer
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (
      userToDelete.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      userToDelete.uid === ADMIN_UID
    ) {
      setFeedbackMessage({
        type: 'error',
        text: "Le compte de l'administrateur principal ne peut pas être supprimé.",
      });
      setUserToDelete(null);
      return;
    }

    setDeleteLoading(true);
    try {
      const deletedEmail = userToDelete.email;
      await deleteUserAndData(userToDelete.uid);
      setUserToDelete(null);
      setFeedbackMessage({
        type: 'success',
        text: `Le compte ${deletedEmail} et toutes ses données associées ont été supprimés avec succès.`,
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error("Erreur lors de la suppression :", err);
      setFeedbackMessage({
        type: 'error',
        text: "Erreur lors de la suppression : " + (err.message || err),
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Action : Création directe d'utilisateur pré-approuvé
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!newEmail.trim()) {
      setAddError("Veuillez renseigner une adresse email valide.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setAddError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    setAddLoading(true);
    try {
      await createPreApprovedUser(newEmail.trim(), newPassword.trim() || undefined);
      setAddSuccess(`L'utilisateur ${newEmail} a été créé avec succès et pré-approuvé.`);
      setNewEmail('');
      setNewPassword('');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess('');
      }, 1500);
    } catch (err: any) {
      setAddError(err.message || "Erreur lors de la création de l'utilisateur.");
    } finally {
      setAddLoading(false);
    }
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter((u) => {
    const matchesQuery = u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Approuvé</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>En attente</span>
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3.5 h-3.5 text-rose-500" />
            <span>Bloqué</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="admin-panel-root" className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Barre d'en-tête du panneau d'administration */}
        <div
          id="admin-panel-header"
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                id="btn-admin-back"
                type="button"
                onClick={onBack}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                title="Retour à l'application"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Panneau d'Administration
                </h1>
                <span className="px-2 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Admin
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestion centralisée des comptes, des rôles et des autorisations d'accès.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-open-add-user"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Ajouter un utilisateur</span>
            </button>
          </div>
        </div>

        {/* Message de notification d'action */}
        {feedbackMessage && (
          <div
            id="admin-feedback-banner"
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium border shadow-xs transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : feedbackMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-xs font-semibold underline hover:opacity-75 transition-opacity"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Encadré Diagnostic Firebase & Droits d'accès */}
        <div
          id="admin-diagnostic-card"
          className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 bg-linear-to-b from-indigo-50/40 to-white"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Diagnostic Droits Administrateur & Firebase
                </h2>
                <p className="text-xs text-slate-500">
                  Vérifiez en direct l'authentification et les autorisations Firestore.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunDiagnostic}
                disabled={isTestingDiag}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingDiag ? 'animate-spin' : ''}`} />
                <span>{isTestingDiag ? 'Test en cours...' : 'Tester les permissions'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDiagOpen(!isDiagOpen)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title={isDiagOpen ? 'Masquer' : 'Afficher'}
              >
                {isDiagOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isDiagOpen && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* Email connecté */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-medium block mb-1">Email session active :</span>
                  <span className="font-mono font-bold text-slate-800 break-all">
                    {user?.email || 'Non connecté'}
                  </span>
                </div>

                {/* UID Firebase avec bouton Copier */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-400 font-medium block mb-1">Identifiant UID Firebase :</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-800 truncate" title={user?.uid}>
                      {user?.uid || '—'}
                    </span>
                    {user?.uid && (
                      <button
                        type="button"
                        onClick={() => handleCopyUid(user.uid)}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors inline-flex items-center gap-1 shrink-0"
                        title="Copier l'UID pour l'ajouter aux règles Firebase"
                      >
                        {copiedUid ? (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Copié
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold flex items-center gap-0.5">
                            <Copy className="w-3 h-3" /> Copier
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode Session */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-medium block mb-1">Source de session :</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    {user?.isLocalFallback ? (
                      <span className="text-amber-600">Mode Local de secours (Hors Firebase)</span>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Firebase Auth Cloud Connecté
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Résultats du test en direct */}
              {diagnostic && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 mt-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Résultats du test direct Firestore :
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {/* Lecture /users */}
                    <div
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                        diagnostic.canReadUsers
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {diagnostic.canReadUsers ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>Lecture `/users`</span>
                      </div>
                      <span className="text-[11px] opacity-90">
                        {diagnostic.canReadUsers
                          ? 'Autorisée (temps réel OK)'
                          : diagnostic.readUsersError}
                      </span>
                    </div>

                    {/* Écriture /admins */}
                    <div
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                        diagnostic.canWriteAdminDoc
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {diagnostic.canWriteAdminDoc ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>Écriture `/admins`</span>
                      </div>
                      <span className="text-[11px] opacity-90">
                        {diagnostic.canWriteAdminDoc
                          ? 'Autorisée (profil admin OK)'
                          : diagnostic.writeAdminDocError}
                      </span>
                    </div>

                    {/* Écriture /users */}
                    <div
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                        diagnostic.canWriteUserDoc
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {diagnostic.canWriteUserDoc ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>Écriture `/users`</span>
                      </div>
                      <span className="text-[11px] opacity-90">
                        {diagnostic.canWriteUserDoc
                          ? 'Autorisée (Approbation OK)'
                          : diagnostic.writeUserDocError}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barre de recherche et filtres de statut */}
        <div
          id="admin-controls-card"
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="admin-user-search-input"
              type="text"
              placeholder="Rechercher par adresse e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Statut :</span>
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Tous ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'approved'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'hover:text-emerald-700'
                }`}
              >
                Approuvés
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'hover:text-amber-700'
                }`}
              >
                En attente
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('disabled')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'disabled'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'hover:text-rose-700'
                }`}
              >
                Bloqués
              </button>
            </div>
          </div>
        </div>

        {/* Tableau des utilisateurs */}
        <div
          id="admin-users-table-card"
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          {loading ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium">Chargement des utilisateurs...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-sm">Aucun utilisateur trouvé pour cette recherche.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="admin-users-table" className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Utilisateur</th>
                    <th className="py-3.5 px-6">Date d'inscription</th>
                    <th className="py-3.5 px-6">Rôle</th>
                    <th className="py-3.5 px-6">Statut</th>
                    <th className="py-3.5 px-6 text-right">Actions rapides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUsers.map((u) => {
                    const isMainAdmin =
                      u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
                      u.uid === ADMIN_UID;

                    return (
                      <tr
                        key={u.uid}
                        className="hover:bg-slate-50/75 transition-colors"
                      >
                        {/* Email */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {u.email.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                                <span>{u.email}</span>
                                {isMainAdmin && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                    Principal
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">
                                {u.uid}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date d'inscription */}
                        <td className="py-4 px-6 text-slate-500 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {u.createdAt
                                ? new Date(u.createdAt).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Non renseignée'}
                            </span>
                          </div>
                        </td>

                        {/* Rôle */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        {/* Statut avec badges de couleurs */}
                        <td className="py-4 px-6">
                          {getStatusBadge(u.status)}
                        </td>

                        {/* Actions rapides */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {/* Bouton Approuver */}
                            {u.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleApprove(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                title="Approuver l'utilisateur"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approuver</span>
                              </button>
                            )}

                            {/* Bouton Bloquer */}
                            {!isMainAdmin && u.status !== 'disabled' && (
                              <button
                                type="button"
                                onClick={() => handleBlock(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                                title="Bloquer l'accès"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Bloquer</span>
                              </button>
                            )}

                            {/* Bouton Supprimer */}
                            {!isMainAdmin && (
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                                title="Supprimer l'utilisateur et ses données"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal : Ajouter un utilisateur pré-approuvé */}
      {isAddModalOpen && (
        <div
          id="modal-add-user-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-add-user-card"
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Ajouter un utilisateur
                  </h2>
                  <p className="text-xs text-slate-500">
                    Le compte créé sera directement pré-approuvé (approved).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                {addError}
              </div>
            )}

            {addSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                {addSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="nouvel.utilisateur@exemple.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mot de passe provisoire (optionnel)
                </label>
                <input
                  type="password"
                  placeholder="Laisser vide pour mot de passe par défaut"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Si non renseigné, un mot de passe sécurisé temporaire sera assigné.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {addLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Créer le compte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : Confirmation de suppression */}
      {userToDelete && (
        <div
          id="modal-delete-user-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="modal-delete-user-card"
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Supprimer l'utilisateur ?
                </h3>
                <p className="text-xs text-slate-500">
                  Cette action est irréversible et supprimera le compte et toutes ses données associées.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-800 break-all">
              {userToDelete.email}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                {deleteLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
