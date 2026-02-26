import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Team, TeamMember } from 'shared';
import { api } from '../api/client';
import Modal from '../components/ui/Modal';

export default function Teams() {
  const { t } = useTranslation();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);

  // Remove state
  const [removeId, setRemoveId] = useState<string | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      const data = await api.teams.get();
      setTeam(data.team);
      setMembers(data.members);
    } catch {
      // No team exists or error - both are fine
      setTeam(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam() {
    if (!teamName.trim()) return;
    setCreatingTeam(true);
    try {
      const created = await api.teams.create(teamName);
      setTeam(created);
      toast.success(t('teams.createSuccess'));
      setTeamName('');
      loadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setCreatingTeam(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.teams.invite(inviteEmail, inviteRole);
      toast.success(t('teams.inviteSuccess'));
      setInviteEmail('');
      loadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove() {
    if (!removeId) return;
    try {
      await api.teams.removeMember(removeId);
      toast.success(t('teams.removeSuccess'));
      setRemoveId(null);
      loadTeam();
    } catch {
      toast.error(t('common.error'));
    }
  }

  function getRoleBadgeClass(role: string) {
    switch (role) {
      case 'owner':
        return 'text-[10px] font-medium px-2 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20';
      case 'admin':
        return 'text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20';
      default:
        return 'text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-500/15 text-zinc-400 border border-zinc-500/20';
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'owner':
        return t('teams.owner');
      case 'admin':
        return t('teams.roleAdmin');
      default:
        return t('teams.roleViewer');
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="h-7 w-40 bg-zinc-800/60 rounded animate-pulse" />
        </div>
        <div className="card p-5 animate-pulse">
          <div className="h-4 w-32 bg-zinc-800/60 rounded mb-4" />
          <div className="space-y-3">
            <div className="h-10 bg-zinc-800/60 rounded" />
            <div className="h-10 bg-zinc-800/60 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // No team - show create form
  if (!team) {
    return (
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 mb-8">
          {t('teams.title')}
        </h1>

        <div className="card text-center py-20">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">{t('teams.noTeam')}</p>
          <p className="text-xs text-zinc-600 mt-1.5 mb-6">{t('teams.noTeamDesc')}</p>

          <div className="max-w-xs mx-auto space-y-3">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t('teams.teamNamePlaceholder')}
              className="input"
            />
            <button
              onClick={handleCreateTeam}
              disabled={creatingTeam || !teamName.trim()}
              className="btn-primary w-full"
            >
              {creatingTeam ? t('common.saving') : t('teams.createTeam')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Team exists - show team management
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-zinc-100 mb-8">
        {t('teams.title')}
      </h1>

      {/* Team Info */}
      <div className="card p-5 mb-4">
        <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">
          {t('teams.teamName')}
        </h2>
        <div className="text-sm font-medium text-zinc-200">{team.name}</div>
      </div>

      {/* Members List */}
      <div className="card p-5 mb-4">
        <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">
          {t('teams.members')}
        </h2>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-zinc-200">{member.user_id}</div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">
                    {!member.joined_at && (
                      <span className="text-amber-400">{t('teams.pendingInvite')}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className={getRoleBadgeClass(member.role)}>
                  {getRoleLabel(member.role)}
                </span>
                {member.role !== 'owner' && (
                  <button
                    onClick={() => setRemoveId(member.id)}
                    className="btn-danger text-xs"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member */}
      <div className="card p-5">
        <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">
          {t('teams.inviteMember')}
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="label">{t('teams.inviteEmail')}</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="input"
            />
          </div>
          <div className="w-full sm:w-36">
            <label className="label">{t('teams.inviteRole')}</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'viewer')}
              className="input"
            >
              <option value="admin">{t('teams.roleAdmin')}</option>
              <option value="viewer">{t('teams.roleViewer')}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="btn-primary"
            >
              {inviting ? t('common.saving') : t('teams.inviteMember')}
            </button>
          </div>
        </div>
      </div>

      {/* Remove Confirmation Modal */}
      <Modal
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={handleRemove}
        title={t('common.delete')}
        description={t('teams.removeConfirm')}
        confirmText={t('common.delete')}
        confirmVariant="danger"
      />
    </div>
  );
}
