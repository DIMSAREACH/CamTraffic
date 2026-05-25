import { useMemo, useState } from 'react';
import {
  User, Mail, Phone, MapPin, CreditCard, Shield, Edit, Save, Key,
  Lock, CheckCircle, AlertCircle, Clock, Activity, LogOut, Bell,
  Globe, Monitor, Smartphone, Eye, EyeOff, Camera, Calendar, Zap
} from 'lucide-react';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate } from '@shared/i18n/localeFormat';
import { authAPI, usersAPI } from '@shared/services/api';
import {
  calcPasswordStrength,
  getPasswordValidationError,
  isStrongPassword,
  PASSWORD_REQUIREMENTS,
  STRENGTH_META,
} from '@shared/utils/passwordPolicy';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { toast } from 'sonner';

const RECENT_SESSIONS = [
  { device: 'Chrome on Windows',  location: 'Phnom Penh, KH', time: '2 minutes ago',  icon: <Monitor size={13} />,    current: true },
  { device: 'Safari on iPhone',   location: 'Siem Reap, KH',  time: '3 hours ago',   icon: <Smartphone size={13} />, current: false },
  { device: 'Firefox on macOS',   location: 'Phnom Penh, KH', time: '2 days ago',    icon: <Monitor size={13} />,    current: false },
];

const ACTIVITY_LOG = [
  { action: 'Profile updated',          time: '1 hour ago',   color: '#2563EB', icon: <Edit size={12} /> },
  { action: 'Password changed',         time: '3 days ago',   color: '#D97706', icon: <Key size={12} /> },
  { action: 'New vehicle registered',   time: '5 days ago',   color: '#059669', icon: <CheckCircle size={12} /> },
  { action: 'Fine #F-2024-089 paid',    time: '1 week ago',   color: '#EF4444', icon: <CreditCard size={12} /> },
  { action: 'Account login',            time: '1 week ago',   color: '#7C3AED', icon: <Shield size={12} /> },
];

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t, locale } = useLanguage();

  const ROLE_META = useMemo(() => ({
    admin:  { label: t('role.adminFull'), desc: t('role.adminDesc'), gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', shadow: 'rgba(139,92,246,0.35)' },
    police: { label: t('role.policeOfficer'), desc: t('role.policeDesc'), gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', shadow: 'rgba(37,99,235,0.35)' },
    driver: { label: t('role.driverRegistered'), desc: t('role.driverDesc'), gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)', shadow: 'rgba(6,182,212,0.35)' },
  }), [t]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '', address: user?.address || '', license_no: user?.license_no || '' });
  const [pwForm, setPwForm] = useState({ current: '', new_password: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'sessions'>('info');
  const [notifPrefs, setNotifPrefs] = useState({ fines: true, detections: true, alerts: true, system: false });
  const [twoFA, setTwoFA] = useState(false);

  if (!user) return null;

  const meta = ROLE_META[user.role];

  const pwStrength = calcPasswordStrength(pwForm.new_password);
  const pwMeta = STRENGTH_META[pwStrength];

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await usersAPI.update(user.id, form);
      updateUser(updated);
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.new_password) { toast.error('Fill all password fields'); return; }
    if (pwForm.new_password !== pwForm.confirm) { toast.error('New passwords do not match'); return; }
    const pwdError = getPasswordValidationError(pwForm.new_password);
    if (pwdError || !isStrongPassword(pwForm.new_password)) {
      toast.error(pwdError ?? 'Password must meet all strength requirements.');
      return;
    }
    setChangingPw(true);
    try {
      await authAPI.changePassword(pwForm.current, pwForm.new_password);
      toast.success('Password updated successfully!');
      setPwForm({ current: '', new_password: '', confirm: '' });
    } catch {
      toast.error('Could not update password. Check your current password.');
    } finally {
      setChangingPw(false);
    }
  };

  const TABS = [
    { id: 'info',     label: t('profile.personalInfo'), icon: <User size={13} /> },
    { id: 'security', label: t('profile.security'), icon: <Shield size={13} /> },
    { id: 'sessions', label: t('profile.sessions'), icon: <Monitor size={13} /> },
  ] as const;

  return (
    <div className="flex gap-6">

      {/* Left column — profile card + stats */}
      <div className="w-72 flex-shrink-0 space-y-5">

        {/* Avatar card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <div className="h-20 relative" style={{ background: 'linear-gradient(135deg, #0F172A, #0D1B3E)' }}>
            <div className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>
          <div className="px-5 pb-5">
            <div className="flex justify-between items-end -mt-8 mb-4">
              <div className="relative isolate">
                <WelcomeProfileAvatar variant="card" size="lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center pointer-events-none"
                  style={{ background: user.is_active ? '#10B981' : '#EF4444' }} />
              </div>
              <button onClick={() => setEditing(!editing)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={editing
                  ? { border: '1px solid rgba(37,99,235,0.15)', color: '#64748B' }
                  : { background: meta.gradient, color: '#fff', boxShadow: `0 2px 8px ${meta.shadow}` }
                }>
                {editing ? t('profile.cancel') : <><Edit size={11} /> {t('profile.edit')}</>}
              </button>
            </div>
            <div className="mb-3">
              <p className="font-black text-slate-900">{user.full_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            </div>
            <span className="inline-flex text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: meta.gradient }}>
              {meta.label}
            </span>
            <p className="text-[11px] text-slate-400 mt-2">{meta.desc}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t('profile.accountStats')}</p>
          <div className="space-y-3">
            {[
              { label: t('profile.memberSince'), value: formatAppDate(locale, user.created_at, { month: 'short', year: 'numeric' }), icon: <Calendar size={13} />, color: '#2563EB' },
              { label: t('profile.accountStatus'), value: user.is_active ? t('profile.active') : t('profile.suspended'), icon: <CheckCircle size={13} />, color: user.is_active ? '#059669' : '#DC2626' },
              { label: t('profile.roleLevel'), value: user.role === 'admin' ? t('role.admin') : user.role === 'police' ? t('role.officer') : t('role.standard'), icon: <Zap size={13} />, color: '#7C3AED' },
              { label: t('profile.lastLogin'), value: t('profile.justNow'), icon: <Clock size={13} />, color: '#0891B2' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${s.color}18`, color: s.color }}>
                    {s.icon}
                  </div>
                  <span className="text-xs text-slate-500">{s.label}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notification preferences */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
              <Bell size={12} />
            </div>
            <p className="text-xs font-bold text-slate-700">{t('profile.notificationsPrefs')}</p>
          </div>
          <div className="space-y-2.5">
            {([['fines', 'Fine Alerts', '#DC2626'], ['detections', 'AI Detections', '#7C3AED'], ['alerts', 'System Alerts', '#D97706'], ['system', 'Updates', '#2563EB']] as const).map(([key, label, color]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{label}</span>
                <button
                  onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                  className="w-8 h-4 rounded-full transition-all"
                  style={notifPrefs[key] ? { background: meta.gradient } : { background: 'rgba(37,99,235,0.1)' }}>
                  <div className="w-3 h-3 bg-white rounded-full shadow transition-all"
                    style={{ transform: notifPrefs[key] ? 'translateX(16px)' : 'translateX(2px)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(239,68,68,0.12)' }}>
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Danger Zone</p>
          <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.06)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.15)' }}
            onClick={() => toast.error('Contact admin to deactivate your account')}>
            <AlertCircle size={13} /> Deactivate Account
          </button>
        </div>
      </div>

      {/* Right main area */}
      <div className="flex-1 min-w-0 space-y-5">

        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A, #162035)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute top-0 right-0 w-52 h-52 rounded-full -translate-y-14 translate-x-14"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.2)' }}>
                <User size={14} style={{ color: '#60A5FA' }} />
              </div>
              <span className="dashboard-welcome__eyebrow" style={{ color: 'rgba(96,165,250,0.9)' }}>{t('pages.profile.eyebrow')}</span>
            </div>
            <h1 className="dashboard-welcome__title text-white">{t('pages.profile.title')}</h1>
            <p className="dashboard-welcome__meta mt-1" style={{ color: 'rgba(148,163,184,0.7)' }}>{t('pages.profile.heroSubtitle')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-all"
              style={activeTab === t.id
                ? { background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff', boxShadow: '0 2px 8px rgba(15,23,42,0.25)' }
                : { color: '#94A3B8' }
              }>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Personal Info tab */}
        {activeTab === 'info' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-bold text-slate-800">Personal Information</p>
                  <p className="text-xs text-slate-400 mt-0.5">Your contact details and identification</p>
                </div>
                {editing && (
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                    style={{ background: meta.gradient, boxShadow: `0 2px 10px ${meta.shadow}` }}>
                    {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</> : <><Save size={13} /> Save Changes</>}
                  </button>
                )}
              </div>

              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</Label>
                    <Input className="mt-1.5" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone Number</Label>
                    <Input className="mt-1.5" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+855 12 345 678" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Address</Label>
                    <Input className="mt-1.5" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, District, City" />
                  </div>
                  {user.role === 'driver' && (
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver's License</Label>
                      <Input className="mt-1.5" value={form.license_no} onChange={e => setForm(f => ({ ...f, license_no: e.target.value }))} placeholder="DL-KH-2024-XXXXXX" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: <Mail size={14} />,       label: 'Email Address',    value: user.email,                    color: '#2563EB' },
                    { icon: <Phone size={14} />,      label: 'Phone Number',     value: user.phone || '—',              color: '#0891B2' },
                    { icon: <MapPin size={14} />,     label: 'Address',          value: user.address || '—',            color: '#059669' },
                    { icon: <Shield size={14} />,     label: 'Role',             value: meta.label,                    color: '#7C3AED' },
                    ...(user.role === 'driver' ? [{ icon: <CreditCard size={14} />, label: "Driver's License", value: user.license_no || '—', color: '#D97706' }] : []),
                    { icon: <Calendar size={14} />,   label: 'Member Since',     value: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), color: '#2563EB' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: '#F8FAFC' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18`, color: item.color }}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                  <Activity size={15} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Recent Activity</p>
                  <p className="text-xs text-slate-400">Your last actions on this account</p>
                </div>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-0 bottom-0 w-px" style={{ background: 'rgba(37,99,235,0.1)' }} />
                <div className="space-y-4">
                  {ACTIVITY_LOG.map((a, i) => (
                    <div key={i} className="flex items-center gap-4 pl-8 relative">
                      <div className="absolute left-0 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-sm"
                        style={{ background: `${a.color}18`, color: a.color }}>
                        {a.icon}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">{a.action}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                          <Clock size={9} /> {a.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            {/* Change password */}
            <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                  <Key size={15} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Change Password</p>
                  <p className="text-xs text-slate-400">Choose a strong password to keep your account safe</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Password</Label>
                  <div className="relative mt-1.5">
                    <Input type={showCurrent ? 'text' : 'password'} value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} placeholder="Enter current password" className="pr-10" />
                    <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New Password</Label>
                  <div className="relative mt-1.5">
                    <Input type={showNew ? 'text' : 'password'} value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} placeholder="Min 8 chars, upper, number, symbol" className="pr-10" />
                    <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {pwForm.new_password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex-1 h-1 rounded-full transition-all"
                            style={{ background: i <= pwStrength ? pwMeta.color : 'rgba(37,99,235,0.1)' }} />
                        ))}
                      </div>
                      <p className="text-[10px] font-semibold" style={{ color: pwMeta.color }}>{pwMeta.label}</p>
                      <ul className="mt-1 space-y-0.5">
                        {PASSWORD_REQUIREMENTS.map(r => (
                          <li key={r.key} className="text-[10px]" style={{ color: r.test(pwForm.new_password) ? '#059669' : '#94a3b8' }}>
                            {r.test(pwForm.new_password) ? '✓' : '○'} {r.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Confirm Password</Label>
                  <div className="relative mt-1.5">
                    <Input type={showConfirm ? 'text' : 'password'} value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" className="pr-10" />
                    <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {pwForm.confirm && pwForm.new_password && (
                    <p className="text-[10px] mt-1 font-semibold" style={{ color: pwForm.confirm === pwForm.new_password ? '#059669' : '#DC2626' }}>
                      {pwForm.confirm === pwForm.new_password ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={handleChangePassword} disabled={changingPw}
                className="mt-4 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 2px 10px rgba(245,158,11,0.3)' }}>
                {changingPw ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Updating...</> : <><Lock size={13} /> Update Password</>}
              </button>
            </div>

            {/* Security settings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                  <Shield size={15} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Security Settings</p>
                  <p className="text-xs text-slate-400">Manage your account security preferences</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F8FAFC' }}>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security to your account</p>
                  </div>
                  <button onClick={() => { setTwoFA(!twoFA); toast.success(twoFA ? '2FA disabled' : '2FA enabled'); }}
                    className="w-11 h-6 rounded-full transition-all"
                    style={twoFA ? { background: 'linear-gradient(135deg, #2563EB, #06B6D4)' } : { background: 'rgba(37,99,235,0.1)' }}>
                    <div className="w-4 h-4 bg-white rounded-full shadow transition-all"
                      style={{ transform: twoFA ? 'translateX(22px)' : 'translateX(3px)' }} />
                  </button>
                </div>

                {[
                  { label: 'Login Notifications', desc: 'Email alert on new sign-in', enabled: true },
                  { label: 'Suspicious Activity Alerts', desc: 'Alert on unusual account activity', enabled: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F8FAFC' }}>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <div className="w-11 h-6 rounded-full" style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
                      <div className="w-4 h-4 bg-white rounded-full shadow" style={{ transform: 'translateX(22px)', marginTop: '4px' }} />
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">JWT Session Active</p>
                    <p className="text-xs text-emerald-600">Account status: <span className="font-bold">{user.is_active ? 'Active' : 'Suspended'}</span> · Token secured</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sessions tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                    <Globe size={15} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Active Sessions</p>
                    <p className="text-xs text-slate-400">Devices currently logged into your account</p>
                  </div>
                </div>
                <button onClick={() => toast.success('All other sessions terminated')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <LogOut size={11} /> Revoke All Others
                </button>
              </div>
              <div className="space-y-3">
                {RECENT_SESSIONS.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl transition-all"
                    style={s.current
                      ? { background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)' }
                      : { background: '#F8FAFC', border: '1px solid transparent' }
                    }>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={s.current ? { background: 'rgba(37,99,235,0.1)', color: '#2563EB' } : { background: 'rgba(37,99,235,0.06)', color: '#94A3B8' }}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700">{s.device}</p>
                        {s.current && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>Current</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <MapPin size={9} /> {s.location}
                        <span>·</span>
                        <Clock size={9} /> {s.time}
                      </p>
                    </div>
                    {!s.current && (
                      <button onClick={() => toast.success('Session terminated')}
                        className="p-1.5 rounded-lg text-slate-300 transition-all"
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#DC2626'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#CBD5E1'}>
                        <LogOut size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Login history */}
            <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                  <Clock size={15} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Login History</p>
                  <p className="text-xs text-slate-400">Recent sign-in events</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { status: 'success', device: 'Chrome · Windows',   ip: '203.144.x.x', time: 'Today, 4:51 PM' },
                  { status: 'success', device: 'Safari · iPhone',    ip: '101.99.x.x',  time: 'Today, 9:12 AM' },
                  { status: 'failed',  device: 'Unknown browser',    ip: '185.22.x.x',  time: 'Yesterday, 11:43 PM' },
                  { status: 'success', device: 'Firefox · macOS',    ip: '203.144.x.x', time: '3 days ago, 2:20 PM' },
                ].map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F8FAFC' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: h.status === 'success' ? '#10B981' : '#EF4444' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{h.device}</p>
                      <p className="text-[10px] text-slate-400">{h.ip}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{h.time}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={h.status === 'success'
                        ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                        : { background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}>
                      {h.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
