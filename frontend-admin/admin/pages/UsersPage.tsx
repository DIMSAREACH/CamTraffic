import { useState, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Users, Shield, Car,
  BadgeCheck, UserPlus, Pencil, AlertCircle, CheckCircle, XCircle, Trash,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useLanguage } from '@shared/context/LanguageContext';
import { usersAPI } from '@shared/services/api';
import { getPasswordValidationError, isStrongPassword, PASSWORD_REQUIREMENTS } from '@shared/utils/passwordPolicy';
import { toast } from 'sonner';
import type { User, UserRole } from '@shared/types';

const ROLE_META: Record<UserRole, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  admin: { label: 'Admin', icon: <Shield size={11} />, color: '#7C3AED', bg: 'rgba(139,92,246,0.12)' },
  police: { label: 'Police', icon: <BadgeCheck size={11} />, color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  driver: { label: 'Driver', icon: <Car size={11} />, color: '#0891B2', bg: 'rgba(6,182,212,0.12)' },
};

const FILTER_CARDS: {
  key: UserRole | 'all';
  label: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
  gradient: string;
}[] = [
  { key: 'all', label: 'All Users', icon: Users, color: '#64748B', iconBg: 'rgba(100,116,139,0.15)', gradient: 'linear-gradient(135deg, #0F172A, #1E293B)' },
  { key: 'admin', label: 'Admins', icon: Shield, color: '#7C3AED', iconBg: 'rgba(139,92,246,0.15)', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  { key: 'police', label: 'Police', icon: BadgeCheck, color: '#2563EB', iconBg: 'rgba(37,99,235,0.15)', gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
  { key: 'driver', label: 'Drivers', icon: Car, color: '#0891B2', iconBg: 'rgba(6,182,212,0.15)', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
];

const emptyForm = { full_name: '', email: '', password: '', role: 'driver' as UserRole, phone: '', address: '', license_no: '' };

export function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
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

  useEffect(() => {
    let result = [...users];
    if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.license_no || '').toLowerCase().includes(q) || u.phone.includes(q));
    }
    setFiltered(result);
  }, [users, search, roleFilter]);

  const openAdd = () => { setEditUser(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ full_name: u.full_name, email: u.email, password: '', role: u.role, phone: u.phone, address: u.address, license_no: u.license_no || '' });
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
        await usersAPI.update(editUser.id, { full_name: form.full_name, email: form.email, role: form.role, phone: form.phone, address: form.address, license_no: form.license_no || undefined });
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
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await usersAPI.delete(deleteUser.id);
      toast.success('User deleted');
      setDeleteUser(null);
      loadUsers();
    } catch { toast.error('Failed to delete user'); }
  };

  const userList = Array.isArray(users) ? users : [];
  const counts = {
    all: userList.length,
    admin: userList.filter((u) => u.role === 'admin').length,
    police: userList.filter((u) => u.role === 'police').length,
    driver: userList.filter((u) => u.role === 'driver').length,
  };

  const countFor = (key: UserRole | 'all') =>
    key === 'all' ? counts.all : counts[key];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A, #162035)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -translate-y-16 translate-x-16"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
                <Users size={14} style={{ color: '#C4B5FD' }} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(196,181,253,0.9)' }}>Admin Panel</span>
            </div>
            <h1 className="text-white text-[20px] font-black leading-tight" style={{ letterSpacing: '-0.02em' }}>{t('pages.users.title')}</h1>
            <p className="mt-1 text-[12px]" style={{ color: 'rgba(148,163,184,0.7)' }}>{userList.length} total users in the system</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', boxShadow: '0 4px 16px rgba(139,92,246,0.45)' }}>
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FILTER_CARDS.map(({ key, label, icon: Icon, color, iconBg, gradient }) => {
          const active = roleFilter === key;
          const count = countFor(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRoleFilter(key)}
              className="p-4 rounded-2xl text-left transition-all w-full"
              style={active
                ? { background: gradient, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }
                : { background: '#fff', border: '1px solid rgba(37,99,235,0.07)' }
              }
            >
              <span className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-xl inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    background: active ? 'rgba(255,255,255,0.2)' : iconBg,
                    color: active ? '#fff' : color,
                  }}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 block">
                  <span className="block text-2xl font-black leading-none" style={{ color: active ? '#fff' : '#0F172A', letterSpacing: '-0.02em' }}>
                    {count}
                  </span>
                  <span className="block text-xs font-semibold mt-1" style={{ color: active ? 'rgba(255,255,255,0.75)' : '#94A3B8' }}>
                    {label}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-sm text-slate-700 outline-none"
          style={{ border: '1px solid rgba(37,99,235,0.1)' }} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(37,99,235,0.07)' }}>
                {['User', 'Role', 'Phone', 'License', 'Joined', 'Status', 'Actions'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? [...Array(5)].map((_, i) => (
                <TableRow key={i}>{[...Array(7)].map((_, j) => <TableCell key={j}><div className="h-4 rounded-lg animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} /></TableCell>)}</TableRow>
              )) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">No users found.</TableCell>
                </TableRow>
              ) : filtered.map(u => {
                const rm = ROLE_META[u.role];
                return (
                <TableRow key={u.id} className={!u.is_active ? 'opacity-50' : ''}
                  style={{ borderBottom: '1px solid rgba(37,99,235,0.04)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${rm?.color ?? '#475569'}, ${rm?.color ?? '#334155'}88)` }}>
                        {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{u.full_name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
                      style={{ background: rm?.bg, color: rm?.color }}>
                      {rm?.icon}
                      {rm?.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{u.phone}</TableCell>
                  <TableCell>
                    {u.license_no
                      ? <span className="font-mono text-xs text-slate-600 px-1.5 py-0.5 rounded-lg" style={{ background: '#F1F5F9' }}>{u.license_no}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
                      style={u.is_active
                        ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                        : { background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}>
                      {u.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-blue-600">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => handleToggle(u)} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-amber-600">
                        {u.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      </button>
                      <button onClick={() => setDeleteUser(u)} className="p-1.5 rounded-lg transition-colors text-slate-300 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
                {editUser ? <Pencil size={20} style={{ color: '#7C3AED' }} /> : <UserPlus size={20} style={{ color: '#7C3AED' }} />}
              </div>
              <div>
                <DialogTitle>{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editUser ? editUser.email : 'Create a new CamTraffic account'}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Full Name *</Label>
              <Input className="mt-1" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Email *</Label>
              <Input className="mt-1" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            {!editUser && (
              <div>
                <Label className="text-sm">Password *</Label>
                <Input
                  className="mt-1"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 chars, upper, number, symbol"
                />
                {form.password.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {PASSWORD_REQUIREMENTS.map(r => (
                      <li key={r.key} className="text-[11px]" style={{ color: r.test(form.password) ? '#059669' : '#94a3b8' }}>
                        {r.test(form.password) ? '✓' : '○'} {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div>
              <Label className="text-sm">Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2"><Shield size={14} /> Admin</span>
                  </SelectItem>
                  <SelectItem value="police">
                    <span className="flex items-center gap-2"><BadgeCheck size={14} /> Traffic Police</span>
                  </SelectItem>
                  <SelectItem value="driver">
                    <span className="flex items-center gap-2"><Car size={14} /> Driver</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Phone</Label>
                <Input className="mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">License No.</Label>
                <Input className="mt-1" value={form.license_no} onChange={e => setForm(f => ({ ...f, license_no: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Address</Label>
              <Input className="mt-1" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
          >
              {saving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{editUser ? 'Saving...' : 'Creating...'}</>
              ) : editUser ? (
                <><Pencil size={15} /> Save Changes</>
              ) : (
                <><UserPlus size={15} /> Create User</>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Trash size={20} style={{ color: '#DC2626' }} />
              </div>
              <div>
                <DialogTitle>Delete User?</DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span>Delete <span className="font-semibold">{deleteUser?.full_name}</span> from the system?</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white gap-2">
              <Trash2 size={15} /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

