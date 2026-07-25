/** Enterprise notification center catalog (admin UI). */

export type NotifChannel = 'system' | 'email' | 'push' | 'sms';
export type NotifPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotifDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled' | 'pending';
export type NotifRecipientRole = 'driver' | 'officer' | 'admin' | 'all';
export type EnterpriseNotifType =
  | 'system'
  | 'ai'
  | 'violation'
  | 'payment'
  | 'appeal'
  | 'camera'
  | 'security'
  | 'maintenance';

export interface EnterpriseNotification {
  id: string;
  title: string;
  message: string;
  recipientRole: NotifRecipientRole;
  recipientName: string;
  channels: NotifChannel[];
  type: EnterpriseNotifType;
  status: NotifDeliveryStatus;
  priority: NotifPriority;
  sentAt: string;
  sentLabel: string;
  readAt?: string;
  liveId?: number;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  recipientRole: NotifRecipientRole;
  schedule: string;
  channels: NotifChannel[];
  status: 'active' | 'disabled';
  type: EnterpriseNotifType;
}

export interface CatalogTemplate {
  id: string;
  name: string;
  type: EnterpriseNotifType;
  channel: NotifChannel;
  lastUpdated: string;
  subject: string;
  body: string;
}

export const ENTERPRISE_NOTIFICATIONS: EnterpriseNotification[] = [
  {
    id: 'n-violation-1',
    title: 'New Traffic Violation',
    message: 'You have received a traffic violation for exceeding the speed limit on Monivong Blvd.',
    recipientRole: 'driver',
    recipientName: 'Sok Dara',
    channels: ['system', 'email'],
    type: 'violation',
    status: 'delivered',
    priority: 'high',
    sentAt: '2026-07-14T08:15:00',
    sentLabel: 'Today',
    readAt: '2026-07-14T10:45:00',
  },
  {
    id: 'n-payment-1',
    title: 'Payment Reminder',
    message: 'Your fine payment of ₭50,000 is due within 7 days.',
    recipientRole: 'driver',
    recipientName: 'Sok Dara',
    channels: ['email'],
    type: 'payment',
    status: 'sent',
    priority: 'medium',
    sentAt: '2026-07-14T07:00:00',
    sentLabel: 'Today',
  },
  {
    id: 'n-ai-1',
    title: 'AI Alert — High Confidence Detection',
    message: 'Camera CAM-014 detected No Entry (R1-04) with 98.2% confidence.',
    recipientRole: 'officer',
    recipientName: 'Officer Chan',
    channels: ['system', 'push'],
    type: 'ai',
    status: 'read',
    priority: 'medium',
    sentAt: '2026-07-14T06:40:00',
    sentLabel: 'Today',
    readAt: '2026-07-14T06:55:00',
  },
  {
    id: 'n-camera-1',
    title: 'Camera Offline',
    message: 'Camera CAM-007 on Russian Blvd reported offline for 12 minutes.',
    recipientRole: 'admin',
    recipientName: 'Administrator',
    channels: ['system', 'email'],
    type: 'camera',
    status: 'delivered',
    priority: 'critical',
    sentAt: '2026-07-13T22:10:00',
    sentLabel: 'Yesterday',
  },
  {
    id: 'n-training-1',
    title: 'AI Model Training Completed',
    message: 'YOLOv11 training run camtraffic-v3 finished with mAP50 94.8%.',
    recipientRole: 'admin',
    recipientName: 'Administrator',
    channels: ['system', 'email'],
    type: 'ai',
    status: 'read',
    priority: 'low',
    sentAt: '2026-07-13T18:00:00',
    sentLabel: 'Yesterday',
    readAt: '2026-07-13T18:20:00',
  },
  {
    id: 'n-appeal-1',
    title: 'Appeal Assigned',
    message: 'Appeal #AP-2042 has been assigned for officer review.',
    recipientRole: 'officer',
    recipientName: 'Officer Sok',
    channels: ['system'],
    type: 'appeal',
    status: 'sent',
    priority: 'high',
    sentAt: '2026-07-13T14:30:00',
    sentLabel: 'Yesterday',
  },
  {
    id: 'n-security-1',
    title: 'Security Alert',
    message: 'Multiple failed login attempts detected for admin account.',
    recipientRole: 'admin',
    recipientName: 'Administrator',
    channels: ['system', 'email', 'sms'],
    type: 'security',
    status: 'failed',
    priority: 'critical',
    sentAt: '2026-07-12T09:12:00',
    sentLabel: '2 days ago',
  },
  {
    id: 'n-user-1',
    title: 'New User Registered',
    message: 'Driver account registered: Chan Pisey (license KH-449201).',
    recipientRole: 'admin',
    recipientName: 'Administrator',
    channels: ['system'],
    type: 'system',
    status: 'read',
    priority: 'low',
    sentAt: '2026-07-12T08:00:00',
    sentLabel: '2 days ago',
    readAt: '2026-07-12T08:05:00',
  },
  {
    id: 'n-maint-1',
    title: 'System Maintenance',
    message: 'Scheduled maintenance window: 20 Jul 2026 01:00–03:00 ICT.',
    recipientRole: 'all',
    recipientName: 'All Users',
    channels: ['system', 'email'],
    type: 'maintenance',
    status: 'scheduled',
    priority: 'medium',
    sentAt: '2026-07-20T01:00:00',
    sentLabel: 'Scheduled',
  },
];

export const SCHEDULED_NOTIFICATIONS: ScheduledNotification[] = [
  {
    id: 'sn-payment',
    title: 'Payment Reminder',
    recipientRole: 'driver',
    schedule: 'Every Monday',
    channels: ['email'],
    status: 'active',
    type: 'payment',
  },
  {
    id: 'sn-monthly',
    title: 'Monthly System Report',
    recipientRole: 'admin',
    schedule: 'Monthly (1st)',
    channels: ['email'],
    status: 'active',
    type: 'system',
  },
  {
    id: 'sn-camera',
    title: 'Daily Camera Health Summary',
    recipientRole: 'admin',
    schedule: 'Daily 06:00',
    channels: ['system', 'email'],
    status: 'active',
    type: 'camera',
  },
  {
    id: 'sn-patrol',
    title: 'Officer Daily Patrol Summary',
    recipientRole: 'officer',
    schedule: 'Daily 18:00',
    channels: ['push'],
    status: 'disabled',
    type: 'ai',
  },
];

export const CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    id: 'tpl-violation',
    name: 'Violation Notice',
    type: 'violation',
    channel: 'push',
    lastUpdated: 'Today',
    subject: 'Traffic violation — {plate}',
    body: 'You received a violation for {violation} on {date}.',
  },
  {
    id: 'tpl-payment',
    name: 'Payment Reminder',
    type: 'payment',
    channel: 'email',
    lastUpdated: 'Today',
    subject: 'Fine payment reminder — {amount}',
    body: 'Your payment of {amount} is due by {due_date}.',
  },
  {
    id: 'tpl-appeal',
    name: 'Appeal Approved',
    type: 'appeal',
    channel: 'push',
    lastUpdated: 'Today',
    subject: 'Appeal {appeal_id} approved',
    body: 'Your appeal for fine {fine_id} was approved.',
  },
  {
    id: 'tpl-camera',
    name: 'Camera Offline Alert',
    type: 'camera',
    channel: 'email',
    lastUpdated: 'Yesterday',
    subject: 'Camera offline — {camera}',
    body: '{camera} at {road} is offline since {time}.',
  },
  {
    id: 'tpl-training',
    name: 'Model Training Complete',
    type: 'ai',
    channel: 'system',
    lastUpdated: '2 days ago',
    subject: 'Training finished — {model}',
    body: 'Run {run_id} completed with mAP {map}.',
  },
  {
    id: 'tpl-security',
    name: 'Security Alert',
    type: 'security',
    channel: 'email',
    lastUpdated: '3 days ago',
    subject: 'Security alert — {title}',
    body: '{message} Detected from {source} at {time}.',
  },
  {
    id: 'tpl-maintenance',
    name: 'Scheduled Maintenance',
    type: 'maintenance',
    channel: 'system',
    lastUpdated: '1 week ago',
    subject: 'Maintenance window — {window}',
    body: 'CamTraffic will be unavailable from {start} to {end}.',
  },
];

export function getEnterpriseNotification(id: string): EnterpriseNotification | undefined {
  return ENTERPRISE_NOTIFICATIONS.find((n) => n.id === id);
}

export const NOTIF_TYPE_CHART = [
  { name: 'Violation', value: 32 },
  { name: 'AI', value: 24 },
  { name: 'Payment', value: 18 },
  { name: 'System', value: 14 },
  { name: 'Camera', value: 8 },
  { name: 'Security', value: 4 },
] as const;

export const NOTIF_DELIVERY_CHART = [
  { name: 'Delivered', count: 1420 },
  { name: 'Read', count: 1180 },
  { name: 'Sent', count: 210 },
  { name: 'Failed', count: 22 },
  { name: 'Scheduled', count: 18 },
] as const;
