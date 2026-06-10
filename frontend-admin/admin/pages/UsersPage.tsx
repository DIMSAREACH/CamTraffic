import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Users, Shield, Car,
  BadgeCheck, UserPlus, Pencil, AlertCircle, CheckCircle, XCircle, Trash,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useLanguage } from '@shared/context/LanguageContext';
import { usersAPI } from '@shared/services/api';
import { getPasswordValidationError, isStrongPassword, PASSWORD_REQUIREMENTS } from '@shared/utils/passwordPolicy';
import { getProfileImageSrc } from '@shared/utils/profileImage';
import { toast } from 'sonner';
import type { User, UserRole } from '@shared/types';

const ROLE_META: Record<UserRole, { labelKey: string; icon: React.ReactNode; color: string; bg: string; gradient: string }> = {
  admin: { labelKey: 'users.roleAdmin', icon: <Shield size={11} />, color: '#7C3AED', bg: 'rgba(139,92,246,0.12)', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  police: { labelKey: 'users.rolePolice', icon: <BadgeCheck size={11} />, color: '#2563EB', bg: 'rgba(37,99,235,0.12)', gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
  driver: { labelKey: 'users.roleDriver', icon: <Car size={11} />, color: '#0891B2', bg: 'rgba(6,182,212,0.12)', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
};

const FILTER_TABS = ['all', 'admin', 'police', 'driver'] as const;
type FilterTab = typeof FILTER_TABS[number];

const STAT_CARDS = [
  { key: 'all', labelKey: 'users.statAll', icon: Users, variant: 'slate' },
  { key: 'admin', labelKey: 'users.statAdmin', icon: Shield, variant: 'violet' },
  { key: 'police', labelKey: 'users.statPolice', icon: BadgeCheck, variant: 'blue' },
  { key: 'driver', labelKey: 'users.statDriver', icon: Car, variant: 'teal' },
] as const;

const emptyForm = { full_name: '', email: '', password: '', role: 'driver' as UserRole, phone: '', address: '', license_no: '' };

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function UserAvatar({
  name,
  profileImage,
  accent,
}: {
  name: string;
  profileImage?: string | null;
  accent: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = imgFailed ? null : getProfileImageSrc(profileImage);

  if (src) {
    return (
      <div className="enforcement-page__avatar enforcement-page__avatar--photo users-page__avatar">
        <img
          src={src}
          alt={name}
          className="enforcement-page__avatar-img"
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="enforcement-page__avatar users-page__avatar"
      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
    >
      {initials(name)}
    </div>
  );
}

export function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<FilterTab>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersAPI.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setUsers([]);
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    let rows = [...users];
    if (roleFilter !== 'all') rows = rows.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((u) =>
        u.full_name.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || (u.license_no || '').toLowerCase().includes(q)
        || u.phone.includes(q),
      );
    }
    return rows;
  }, [users, search, roleFilter]);

  const counts = useMemo(() => ({
    all: users.length,
    admin: users.filter((u) => u.role === 'admin').length,
    police: users.filter((u) => u.role === 'police').length,
    driver: users.filter((u) => u.role === 'driver').length,
  }), [users]);

  const roleLabel = (role: UserRole) => t(ROLE_META[role].labelKey);

  const openAdd = () => { setEditUser(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({
      full_name: u.full_name, email: u.email, password: '', role: u.role,
      phone: u.phone, address: u.address, license_no: u.license_no || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email) { toast.error('Name and email are required'); return; }
    if (!editUser && !form.password) { toast.error('Password required for new user'); return; }
    if (!editUser) {
      const pwdError = getPasswordValidationError(form.password);
      if (pwdError || !isStrongPassword(form.password)) {
        toast.error(pwdError ?? 'Password must meet all strength requirements.');
        return;
      }
    }
    setSaving(true);
    try {
      if (editUser) {
        await usersAPI.update(editUser.id, {
          full_name: form.full_name, email: form.email, role: form.role,
          phone: form.phone, address: form.address, license_no: form.license_no || undefined,
        });
        toast.success('User updated');
      } else {
        await usersAPI.create({ ...form, role: form.role });
        toast.success('User created');
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u: User) => {
    try {
      await usersAPI.toggleActive(u.id);
      toast.success(`${u.full_name} ${u.is_active ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await usersAPI.delete(deleteUser.id);
      toast.success('User deleted');
      setDeleteUser(null);
      loadUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="enforcement-page enforcement-page--users dashboard-page--users">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Users size={14} />
              </span>
              {t('users.adminEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.users.title')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.users.subtitle')}</p>
          </div>
          <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--violet" onClick={openAdd}>
            <Plus size={16} /> {t('users.addUser')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const active = roleFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setRoleFilter(card.key)}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}${active ? ' enforcement-page__stat-card--active' : ''}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{counts[card.key]}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            {FILTER_TABS.map((tab) => {
              const active = roleFilter === tab;
              const meta = tab !== 'all' ? ROLE_META[tab] : null;
              const label = tab === 'all' ? t('users.allUsers') : roleLabel(tab);
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRoleFilter(tab)}
                  className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                  style={active ? {
                    background: meta?.gradient ?? 'linear-gradient(135deg, #0F172A, #1E293B)',
                  } : undefined}
                >
                  {label}
                  <span className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}>
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="enforcement-page__search-wrap">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--users">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[t('users.colUser'), t('users.colRole'), t('users.colPhone'), t('users.colLicense'), t('users.colJoined'), t('users.colStatus'), t('users.colActions')].map((h, index) => (
                  <TableHead
                    key={h}
                    className={`enforcement-page__th${index === 0 ? ' users-page__col--user text-left' : ' text-center'}`}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton users-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="enforcement-page__empty-icon enforcement-page__empty-icon--violet">
                        <Users size={28} />
                      </div>
                      <div>
                        <p className="enforcement-page__empty-title">{t('users.empty')}</p>
                        <p className="enforcement-page__empty-subtitle">{t('users.emptyHint')}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((u) => {
                const rm = ROLE_META[u.role];
                return (
                  <TableRow key={u.id} className={`enforcement-page__table-row${!u.is_active ? ' users-page__row--inactive' : ''}`}>
                    <TableCell className="py-3.5 users-page__col--user">
                      <div className="users-page__user-cell">
                        <UserAvatar name={u.full_name} profileImage={u.profile_image} accent={rm.color} />
                        <div className="users-page__user-copy">
                          <p className="enforcement-page__cell-primary users-page__truncate" title={u.full_name}>{u.full_name}</p>
                          <p className="enforcement-page__cell-mono users-page__truncate" title={u.email}>{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={{ background: rm.bg, color: rm.color }}>
                        {rm.icon}{roleLabel(u.role)}
                      </span>
                    </TableCell>
                    <TableCell><span className="enforcement-page__cell-body">{u.phone || '—'}</span></TableCell>
                    <TableCell>
                      {u.license_no
                        ? <span className="enforcement-page__code-pill">{u.license_no}</span>
                        : <span className="enforcement-page__cell-secondary">—</span>}
                    </TableCell>
                    <TableCell><span className="enforcement-page__cell-secondary">{new Date(u.created_at).toLocaleDateString()}</span></TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={u.is_active
                        ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                        : { background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}>
                        {u.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {u.is_active ? t('users.active') : t('users.inactive')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="enforcement-page__table-actions users-page__actions">
                        <button type="button" className="users-page__action-btn users-page__action-btn--edit" onClick={() => openEdit(u)} aria-label={t('common.edit')}>
                          <Edit size={13} />
                        </button>
                        <button type="button" className="users-page__action-btn users-page__action-btn--toggle" onClick={() => handleToggle(u)} aria-label={t('users.toggleStatus')}>
                          {u.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        </button>
                        <button type="button" className="users-page__action-btn users-page__action-btn--delete" onClick={() => setDeleteUser(u)} aria-label={t('common.delete')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="enforcement-page__footer">
            <p className="enforcement-page__footer-text">
              {t('users.showing', { shown: filtered.length, total: users.length })}
            </p>
            <p className="enforcement-page__footer-text enforcement-page__footer-text--emphasis">
              {t('users.totalCount', { count: counts.all })}
            </p>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="users-page__dialog max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-0">
          <div className="users-page__dialog-header">
            <div className="users-page__dialog-icon">
              {editUser ? <Pencil size={16} /> : <UserPlus size={16} />}
            </div>
            <DialogTitle className="users-page__dialog-title">
              {editUser ? t('users.editUser') : t('users.addUser')}
            </DialogTitle>
          </div>
          <div className="users-page__dialog-body space-y-3">
            <div>
              <Label className="enforcement-page__form-label">{t('users.fullName')} *</Label>
              <Input className="mt-1" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('users.email')} *</Label>
              <Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            {!editUser && (
              <div>
                <Label className="enforcement-page__form-label">{t('users.password')} *</Label>
                <Input
                  className="mt-1"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={t('users.passwordHint')}
                />
                {form.password.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {PASSWORD_REQUIREMENTS.map((r) => (
                      <li key={r.key} className="enforcement-page__cell-secondary" style={{ color: r.test(form.password) ? '#059669' : undefined }}>
                        {r.test(form.password) ? '✓' : '○'} {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div>
              <Label className="enforcement-page__form-label">{t('users.role')}</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin"><span className="flex items-center gap-2"><Shield size={14} /> {t('users.roleAdmin')}</span></SelectItem>
                  <SelectItem value="police"><span className="flex items-center gap-2"><BadgeCheck size={14} /> {t('users.rolePolice')}</span></SelectItem>
                  <SelectItem value="driver"><span className="flex items-center gap-2"><Car size={14} /> {t('users.roleDriver')}</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="enforcement-page__form-label">{t('users.phone')}</Label>
                <Input className="mt-1" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('users.licenseNo')}</Label>
                <Input className="mt-1" value={form.license_no} onChange={(e) => setForm((f) => ({ ...f, license_no: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('users.address')}</Label>
              <Input className="mt-1" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="users-page__dialog-footer">
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('users.cancel')}</Button>
            <button type="button" className="enforcement-page__btn-violet" onClick={handleSave} disabled={saving}>
              {saving ? t('users.saving') : editUser ? t('users.saveChanges') : t('users.createUser')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent className="users-page__dialog users-page__dialog--danger max-w-sm p-0 gap-0 overflow-hidden rounded-2xl border-0">
          <div className="users-page__dialog-header users-page__dialog-header--danger">
            <div className="users-page__dialog-icon users-page__dialog-icon--danger">
              <Trash size={16} />
            </div>
            <DialogTitle className="users-page__dialog-title">{t('users.deleteTitle')}</DialogTitle>
          </div>
          <p className="users-page__dialog-body enforcement-page__cell-body flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span>{t('users.deleteConfirm', { name: deleteUser?.full_name ?? '' })}</span>
          </p>
          <DialogFooter className="users-page__dialog-footer">
            <Button variant="outline" onClick={() => setDeleteUser(null)}>{t('users.cancel')}</Button>
            <Button onClick={handleDelete} variant="destructive" className="gap-2">
              <Trash2 size={15} /> {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
