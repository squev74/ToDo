import React, { useState, useEffect } from 'react';
import { Mail, Plus, Minus, RotateCcw, AlertTriangle, ShieldCheck, MailWarning } from 'lucide-react';

interface EmailInboxAlertProps {
  spaceId: string;
  spaceName?: string;
}

export const EmailInboxAlert: React.FC<EmailInboxAlertProps> = ({ spaceId, spaceName = 'Espace' }) => {
  const [emailCount, setEmailCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`pmo_inbox_email_count_space_${spaceId}`);
      return saved ? Math.max(0, parseInt(saved, 10)) : 12; // Valeur par défaut réaliste
    } catch {
      return 12;
    }
  });

  // Recharger si spaceId change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pmo_inbox_email_count_space_${spaceId}`);
      setEmailCount(saved ? Math.max(0, parseInt(saved, 10)) : 12);
    } catch {
      setEmailCount(12);
    }
  }, [spaceId]);

  const updateCount = (newCount: number) => {
    const val = Math.max(0, newCount);
    setEmailCount(val);
    try {
      localStorage.setItem(`pmo_inbox_email_count_space_${spaceId}`, String(val));
    } catch (err) {
      console.error('Erreur stockage email count local:', err);
    }
  };

  // Déterminer les seuils
  // Vert (Sain) : <= 50
  // Jaune / Orange (Attention) : > 50
  // Rouge (Critique) : > 100
  let statusColor = 'bg-[#6B8E78]/10 text-[#4e634a] border-[#6B8E78]/25';
  let badgeText = 'Sain';
  let badgeColor = 'bg-[#6B8E78] text-white';
  let warningMessage = 'Triage efficace des e-mails. Aucun retard à déplorer sur les actions clients.';
  let StatusIcon = ShieldCheck;

  if (emailCount > 100) {
    statusColor = 'bg-rose-50 text-rose-900 border-rose-200/60';
    badgeText = 'Critique';
    badgeColor = 'bg-rose-500 text-white';
    warningMessage = "Boîte saturée : Risque élevé d'oubli d'actions prioritaires et de perte de réactivité.";
    StatusIcon = MailWarning;
  } else if (emailCount > 50) {
    statusColor = 'bg-[#C89B7B]/10 text-[#966847] border-[#C89B7B]/25';
    badgeText = 'Attention';
    badgeColor = 'bg-[#C89B7B] text-white';
    warningMessage = 'Risque de retard sur la création des tâches et le suivi des demandes clients.';
    StatusIcon = AlertTriangle;
  }

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.01)] ${statusColor}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Infos & Alerte */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#F0EFEB]">
            <Mail className="h-5 w-5 text-indigo-600/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold tracking-wide text-[#1A1D1A]">
                Santé Triage Mail • {spaceName}
              </h4>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                {badgeText}
              </span>
            </div>
            
            {/* Message dynamique basé sur le seuil */}
            <p className="text-xs font-light mt-1 opacity-90 max-w-xl">
              {warningMessage}
            </p>
          </div>
        </div>

        {/* Compteur & Ajustements */}
        <div className="flex flex-wrap items-center gap-3 bg-white/60 p-2.5 rounded-xl border border-white/50 backdrop-blur-sm self-start md:self-auto shrink-0">
          <span className="text-xs text-[#737873] font-medium px-1">
            Non classés :
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => updateCount(emailCount - 5)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#F0EFEB] text-[#1A1D1A] hover:bg-slate-50 active:scale-95 transition-all"
              title="-5 e-mails"
            >
              <Minus className="h-3 w-3" />
            </button>
            
            <input
              type="number"
              min="0"
              value={emailCount}
              onChange={(e) => updateCount(parseInt(e.target.value, 10) || 0)}
              className="w-14 text-center text-xs font-bold bg-white border border-[#F0EFEB] rounded-lg py-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
            />

            <button
              onClick={() => updateCount(emailCount + 5)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#F0EFEB] text-[#1A1D1A] hover:bg-slate-50 active:scale-95 transition-all"
              title="+5 e-mails"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-l border-[#F0EFEB]/80 pl-2">
            {emailCount > 0 ? (
              <button
                onClick={() => updateCount(0)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#6B8E78] hover:bg-[#5d7c68] text-white px-2.5 py-1 text-[11px] font-medium active:scale-[0.98] transition-all"
                title="Déclarer la boîte mail totalement triée !"
              >
                Zero Inbox 🎉
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B8E78] px-1 py-1">
                Boîte propre ! ✨
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
