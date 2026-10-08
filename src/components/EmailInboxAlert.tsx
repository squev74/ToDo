import React, { useState, useEffect } from 'react';
import { Mail, Plus, Minus, AlertTriangle, ShieldCheck, MailWarning, CheckCircle2 } from 'lucide-react';

interface EmailInboxAlertProps {
  spaceId: string;
  spaceName?: string;
  onCountChange?: (count: number) => void;
}

export const EmailInboxAlert: React.FC<EmailInboxAlertProps> = ({
  spaceId,
  spaceName = 'Espace',
  onCountChange,
}) => {
  const storageKey = `pmo_inbox_email_count_space_${spaceId}`;

  const [emailCount, setEmailCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? Math.max(0, parseInt(saved, 10) || 0) : 0;
    } catch {
      return 0;
    }
  });

  // Recharger si spaceId change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved !== null ? Math.max(0, parseInt(saved, 10) || 0) : 0;
      setEmailCount(parsed);
      onCountChange?.(parsed);
    } catch {
      setEmailCount(0);
    }
  }, [spaceId, storageKey]);

  // Synchroniser si modifié depuis un autre composant
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ spaceId: string; count: number }>;
      if (customEvent.detail && customEvent.detail.spaceId === spaceId) {
        setEmailCount(customEvent.detail.count);
      }
    };
    window.addEventListener('pmo-inbox-updated', handleSync);
    return () => window.removeEventListener('pmo-inbox-updated', handleSync);
  }, [spaceId]);

  const updateCount = (newCount: number) => {
    const val = Math.max(0, isNaN(newCount) ? 0 : newCount);
    setEmailCount(val);
    onCountChange?.(val);
    try {
      localStorage.setItem(storageKey, String(val));
      window.dispatchEvent(
        new CustomEvent('pmo-inbox-updated', { detail: { spaceId, count: val } })
      );
    } catch (err) {
      console.error('Erreur stockage email count local:', err);
    }
  };

  // Déterminer les seuils
  // 0 : Objectif Zero Inbox atteint
  // Vert (Sain) : 1 à 50
  // Jaune / Orange (Attention) : > 50 (51 à 100)
  // Rouge (Critique) : > 100
  let statusColor = 'bg-[#6B8E78]/10 text-[#4e634a] border-[#6B8E78]/25';
  let badgeText = emailCount === 0 ? 'Objectif 0 Email atteint' : 'Sain (≤ 50)';
  let badgeColor = 'bg-[#6B8E78] text-white';
  let warningMessage =
    emailCount === 0
      ? 'Félicitations ! Votre boîte de réception est à 0 email. Aucune action en attente.'
      : 'Triage maîtrisé des e-mails (≤ 50). Aucun retard à déplorer sur les actions clients.';
  let StatusIcon = emailCount === 0 ? CheckCircle2 : ShieldCheck;

  if (emailCount > 100) {
    statusColor = 'bg-rose-50 text-rose-900 border-rose-200/80';
    badgeText = 'Alerte Critique (> 100)';
    badgeColor = 'bg-rose-600 text-white animate-pulse';
    warningMessage = `Alerte Critique (${emailCount} e-mails > 100) : Boîte mail saturée ! Risque élevé d'oubli d'actions prioritaires et de perte de réactivité.`;
    StatusIcon = MailWarning;
  } else if (emailCount > 50) {
    statusColor = 'bg-amber-50/90 text-amber-900 border-amber-200/80';
    badgeText = 'Alerte (> 50)';
    badgeColor = 'bg-amber-600 text-white';
    warningMessage = `Attention (${emailCount} e-mails > 50) : Seuil de vigilance dépassé. Risque de retard sur la création des tâches et le suivi des demandes.`;
    StatusIcon = AlertTriangle;
  }

  return (
    <div
      id="email-inbox-alert-widget"
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.01)] ${statusColor}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Infos & Alerte */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#F0EFEB]">
            <Mail
              className={`h-5 w-5 ${
                emailCount > 100
                  ? 'text-rose-600'
                  : emailCount > 50
                  ? 'text-amber-600'
                  : 'text-[#6B8E78]'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold tracking-wide text-[#1A1D1A]">
                Objectif 0 Email (Boîte de réception) • {spaceName}
              </h4>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}
              >
                <StatusIcon className="h-3 w-3" />
                <span>{badgeText}</span>
              </span>
            </div>

            {/* Message dynamique basé sur le seuil */}
            <p className="text-xs font-normal mt-1 opacity-90 max-w-2xl">
              {warningMessage}
            </p>
          </div>
        </div>

        {/* Compteur & Ajustements */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white/80 p-2 rounded-xl border border-[#F0EFEB] backdrop-blur-sm self-start md:self-auto shrink-0">
          <label htmlFor={`inbox-count-input-${spaceId}`} className="text-xs text-[#737873] font-medium px-1">
            Emails en boîte :
          </label>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateCount(emailCount - 5)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#F0EFEB] text-[#1A1D1A] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              title="-5 e-mails"
            >
              <Minus className="h-3 w-3" />
            </button>

            <input
              id={`inbox-count-input-${spaceId}`}
              type="number"
              min="0"
              value={emailCount}
              onChange={(e) => {
                const raw = e.target.value;
                updateCount(raw === '' ? 0 : parseInt(raw, 10));
              }}
              className="w-16 text-center text-xs font-bold bg-white border border-[#F0EFEB] rounded-lg py-1 text-[#1A1D1A] focus:outline-none focus:border-[#6B8E78] focus:ring-1 focus:ring-[#6B8E78]/20"
            />

            <button
              type="button"
              onClick={() => updateCount(emailCount + 5)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#F0EFEB] text-[#1A1D1A] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              title="+5 e-mails"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-l border-[#F0EFEB] pl-2">
            {emailCount > 0 ? (
              <button
                type="button"
                onClick={() => updateCount(0)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#6B8E78] hover:bg-[#5d7c68] text-white px-2.5 py-1 text-[11px] font-medium active:scale-[0.98] transition-all cursor-pointer"
                title="Réinitialiser à 0 email (Zero Inbox)"
              >
                0 Email 🎉
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B8E78] px-1.5 py-0.5">
                Zero Inbox ✨
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

