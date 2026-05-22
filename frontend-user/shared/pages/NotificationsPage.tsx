import { useState, useEffect } from 'react';
import {
  Bell, CheckCheck, FileText, Camera, AlertTriangle, Info,
  Settings, Trash2, BellOff, TrendingUp, Clock, Filter, RefreshCw,
  ChevronRight, Shield, Car, Zap
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { notificationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Notification, NotificationType } from '@shared/types';

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; label: string; gradient: string; bg: string; color: string }> = {
  fine:      { icon: <FileText size={15} />,      label: 'Fine',      gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', bg: 'rgba(239,68,68,0.1)',    color: '#DC2626' },
  detection: { icon: <Camera size={15} />,         label: 'Detection', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', bg: 'rgba(139,92,246,0.1)',   color: '#7C3AED' },
  alert:     { icon: <AlertTriangle size={15} />,  label: 'Alert',     gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', bg: 'rgba(245,158,11,0.1)',   color: '#D97706' },
  system:    { icon: <Info size={15} />,           label: 'System',    gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', bg: 'rgba(37,99,235,0.1)',    color: '#2563EB' },
};

const QUICK_ACTIONS = [
  { icon: <CheckCheck size={16} />, label: 'Mark All Read',    color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   action: 'markAll' },
  { icon: <BellOff size={16} />,    label: 'Mute 1 Hour',      color: '#7C3AED', bg: 'rgba(139,92,246,0.08)', action: 'mute' },
  { icon: <Trash2 size={16} />,     label: 'Clear All Read',   color: '#DC2626', bg: 'rgba(239,68,68,0.08)',  action: 'clear' },
  { icon: <RefreshCw size={16} />,  label: 'Refresh Feed',     color: '#059669', bg: 'rgba(16,185,129,0.08)', action: 'refresh' },
];

const NOTIFICATION_PREFS = [
  { icon: <FileText size={14} />,      label: 'Fine Issued',        desc: 'New fines assigned to you',     enabled: true,  color: '#DC2626' },
  { icon: <Camera size={14} />,        label: 'AI Detections',       desc: 'Sign recognition results',      enabled: true,  color: '#7C3AED' },
  { icon: <AlertTriangle size={14} />, label: 'System Alerts',      desc: 'Critical system events',        enabled: true,  color: '#D97706' },
  { icon: <Shield size={14} />,        label: 'Security Events',    desc: 'Login & account activity',      enabled: false, color: '#0891B2' },
  { icon: <Car size={14} />,           label: 'Vehicle Updates',    desc: 'Registration & changes',        enabled: true,  color: '#059669' },
  { icon: <Zap size={14} />,           label: 'Real-time Alerts',   desc: 'Instant push notifications',    enabled: false, color: '#D97706' },
];

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  notifications.forEach(n => {
    const d = new Date(n.created_at);
    const now = new Date();
    let key: string;
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) key = 'Today';
    else if (diffDays === 1) key = 'Yesterday';
    else if (diffDays < 7) key = 'This Week';
    else key = 'Older';
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
}

export function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [prefs, setPrefs] = useState(NOTIFICATION_PREFS.map(p => ({ ...p })));

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await notificationsAPI.getByUser(user.id);
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotifications(); }, [user]);

  const handleMarkRead = async (id: number) => {
    await notificationsAPI.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationsAPI.markAllRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const handleQuickAction = (action: string) => {
    if (action === 'markAll') handleMarkAllRead();
    else if (action === 'mute') toast.success('Notifications muted for 1 hour');
    else if (action === 'clear') {
      setNotifications(prev => prev.filter(n => !n.is_read));
      toast.success('Read notifications cleared');
    } else if (action === 'refresh') {
      loadNotifications();
      toast.success('Feed refreshed');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const typeCounts = (['fine', 'detection', 'alert', 'system'] as NotificationType[]).reduce((acc, t) => {
    acc[t] = notifications.filter(n => n.type === t).length;
    return acc;
  }, {} as Record<NotificationType, number>);

  const displayed = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter !== 'all') return n.type === filter;
    return true;
  });

  const grouped = groupByDate(displayed);
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older'];

  return (
    <div className="flex gap-6">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A, #162035)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute top-0 right-0 w-52 h-52 rounded-full -translate-y-14 translate-x-14"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)' }} />
          <div className="relative flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center relative" style={{ background: 'rgba(37,99,235,0.2)' }}>
                  <Bell size={14} style={{ color: '#60A5FA' }} />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-[#0F172A] animate-pulse" style={{ background: '#EF4444' }} />}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(96,165,250,0.9)' }}>Notification Center</span>
              </div>
              <h1 className="text-white text-[20px] font-black leading-tight" style={{ letterSpacing: '-0.02em' }}>{t('pages.notifications.title')}</h1>
              <p className="mt-1 text-[12px]" style={{ color: unreadCount > 0 ? 'rgba(252,165,165,0.9)' : 'rgba(134,239,172,0.9)' }}>
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : '✓ All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold transition-all"
              style={{ background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(37,99,235,0.35)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.4)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.25)'; }}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {([['fine', 'Fines'], ['detection', 'Detections'], ['alert', 'Alerts'], ['system', 'System']] as const).map(([type, label]) => {
            const cfg = TYPE_CONFIG[type];
            return (
              <button key={type} onClick={() => setFilter(filter === type ? 'all' : type)}
                className="rounded-2xl p-4 text-left transition-all"
                style={filter === type
                  ? { background: cfg.gradient, boxShadow: `0 4px 16px ${cfg.bg.replace('0.1', '0.35')}` }
                  : { background: '#fff', border: '1px solid rgba(37,99,235,0.07)' }
                }>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={filter === type ? { background: 'rgba(255,255,255,0.2)', color: '#fff' } : { background: cfg.bg, color: cfg.color }}>
                    {cfg.icon}
                  </div>
                  {typeCounts[type] > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={filter === type ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: cfg.bg, color: cfg.color }}>
                      {typeCounts[type]}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold" style={{ color: filter === type ? '#fff' : '#94A3B8' }}>{label}</p>
              </button>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={filter === f
                ? { background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff', boxShadow: '0 2px 8px rgba(15,23,42,0.25)' }
                : { background: '#fff', color: '#64748B', border: '1px solid rgba(37,99,235,0.1)' }
              }>
              {f === 'all' ? 'All' : 'Unread'}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 text-xs text-white px-1.5 py-0.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl" style={{ border: '2px dashed rgba(37,99,235,0.1)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(37,99,235,0.05)' }}>
              <Bell size={28} style={{ color: 'rgba(37,99,235,0.2)' }} />
            </div>
            <p className="text-slate-500 font-semibold">No notifications</p>
            <p className="text-slate-400 text-sm mt-1">{filter === 'unread' ? 'You\'re all caught up!' : 'Nothing here yet'}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupOrder.filter(g => grouped[g]?.length).map(group => (
              <div key={group}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{group}</p>
                  <div className="flex-1 h-px" style={{ background: 'rgba(37,99,235,0.07)' }} />
                  <span className="text-[10px] text-slate-300">{grouped[group].length}</span>
                </div>
                <div className="space-y-2">
                  {grouped[group].map(n => {
                    const cfg = TYPE_CONFIG[n.type];
                    return (
                      <div key={n.id}
                        onClick={() => !n.is_read && handleMarkRead(n.id)}
                        className="flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer"
                        style={n.is_read
                          ? { background: '#fff', border: '1px solid rgba(37,99,235,0.07)' }
                          : { background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.15)', boxShadow: '0 2px 8px rgba(37,99,235,0.06)' }
                        }
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = n.is_read ? '' : '0 2px 8px rgba(37,99,235,0.06)'}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold" style={{ color: n.is_read ? '#64748B' : '#0F172A' }}>{n.title}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                                <Clock size={9} /> {timeAgo(n.created_at)}
                              </span>
                              {!n.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }} />}
                            </div>
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: n.is_read ? '#94A3B8' : '#475569' }}>{n.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                              style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                            {!n.is_read && (
                              <span className="text-[10px] font-semibold" style={{ color: '#2563EB' }}>Click to mark read</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-72 flex-shrink-0 space-y-5">

        {/* Quick actions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
              <Zap size={14} />
            </div>
            <p className="text-sm font-bold text-slate-700">Quick Actions</p>
          </div>
          <div className="space-y-2">
            {QUICK_ACTIONS.map(qa => (
              <button key={qa.label} onClick={() => handleQuickAction(qa.action)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{ background: qa.bg }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'white', color: qa.color }}>
                  {qa.icon}
                </div>
                <span className="text-xs font-semibold" style={{ color: qa.color }}>{qa.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notification summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
              <TrendingUp size={14} />
            </div>
            <p className="text-sm font-bold text-slate-700">Summary</p>
          </div>
          <div className="space-y-3">
            {([['fine', 'Fines'], ['detection', 'Detections'], ['alert', 'Alerts'], ['system', 'System']] as const).map(([type, label]) => {
              const cfg = TYPE_CONFIG[type];
              const count = typeCounts[type] || 0;
              const pct = notifications.length ? Math.round((count / notifications.length) * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500">{label}</span>
                    <span className="text-xs font-bold" style={{ color: cfg.color }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(37,99,235,0.07)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.gradient }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(37,99,235,0.07)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total</span>
              <span className="text-sm font-black text-slate-700">{notifications.length}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">Unread</span>
              <span className="text-sm font-black" style={{ color: '#2563EB' }}>{unreadCount}</span>
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
              <Settings size={14} />
            </div>
            <p className="text-sm font-bold text-slate-700">Preferences</p>
          </div>
          <div className="space-y-3">
            {prefs.map((pref, i) => (
              <div key={pref.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${pref.color}18`, color: pref.color }}>
                    {pref.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{pref.label}</p>
                    <p className="text-[10px] text-slate-400">{pref.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPrefs(prev => prev.map((p, j) => j === i ? { ...p, enabled: !p.enabled } : p))}
                  className="w-9 h-5 rounded-full transition-all flex-shrink-0"
                  style={pref.enabled
                    ? { background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }
                    : { background: 'rgba(37,99,235,0.1)' }
                  }>
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow transition-all mx-auto"
                    style={{ transform: pref.enabled ? 'translateX(7px)' : 'translateX(-7px)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
