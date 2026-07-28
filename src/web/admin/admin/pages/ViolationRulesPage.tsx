import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Scale, CheckCircle, XCircle, RefreshCw, Hash, Pencil, Loader2,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { RielIcon } from '@shared/components/RielIcon';
import { usePagination } from '@shared/hooks/usePagination';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, khrToUsd, usdToKhr } from '@shared/i18n/localeFormat';
import { FieldError, FormErrorBanner } from '@shared/components/ui/FieldError';
import { violationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { ViolationRule } from '@shared/types';

type RuleCategory =
  | 'traffic_sign'
  | 'vehicle_behavior'
  | 'speed'
  | 'traffic_light'
  | 'parking'
  | 'lane_violation'
  | 'vehicle_equipment'
  | 'other';

type DetectionMethod = 'yolo' | 'ocr' | 'speed_sensor' | 'manual' | 'fusion';

type RuleFormField =
  | 'title'
  | 'category'
  | 'fine_khr'
  | 'conditions';

type RuleFormState = {
  rule_code: string;
  title: string;
  category: RuleCategory;
  detection_type: DetectionMethod;
  // traffic sign
  traffic_sign: string;
  vehicle_action: string;
  // vehicle behavior / equipment
  vehicle_type: string;
  required_object: string;
  detection_condition: string;
  // speed
  speed_limit: string;
  speed_operator: string;
  // traffic light
  light_state: string;
  light_vehicle_action: string;
  // parking
  parking_zone: string;
  vehicle_status: string;
  // lane
  lane_condition: string;
  // penalty (KHR)
  fine_khr: string;
  demerit_points: string;
  warning_only: boolean;
  // legal
  legal_reference: string;
  description: string;
  // AI
  confidence_threshold: string;
  ocr_required: boolean;
  police_review_required: boolean;
  save_original: boolean;
  save_detection: boolean;
  save_plate: boolean;
  save_ai_result: boolean;
  is_active: boolean;
};

const CATEGORIES: { value: RuleCategory; label: string }[] = [
  { value: 'traffic_sign', label: 'Traffic Sign' },
  { value: 'vehicle_behavior', label: 'Vehicle Behavior' },
  { value: 'speed', label: 'Speed Violation' },
  { value: 'traffic_light', label: 'Traffic Light' },
  { value: 'parking', label: 'Parking' },
  { value: 'lane_violation', label: 'Lane Violation' },
  { value: 'vehicle_equipment', label: 'Vehicle Equipment' },
  { value: 'other', label: 'Other' },
];

const SIGN_CLASSES = [
  { value: 'NO_ENTRY', label: 'No Entry' },
  { value: 'STOP', label: 'Stop' },
  { value: 'NO_PARKING', label: 'No Parking' },
  { value: 'NO_STOPPING', label: 'No Stopping' },
  { value: 'SPEED_LIMIT', label: 'Speed Limit' },
  { value: 'NO_LEFT_TURN', label: 'No Left Turn' },
  { value: 'NO_RIGHT_TURN', label: 'No Right Turn' },
  { value: 'NO_U_TURN', label: 'No U-Turn' },
  { value: 'ONE_WAY', label: 'One Way' },
  { value: 'ROAD_CLOSED_ALL_USERS', label: 'Road Closed' },
];

const VEHICLE_ACTIONS = [
  { value: 'ENTER', label: 'ENTER' },
  { value: 'LEFT_TURN', label: 'TURN LEFT' },
  { value: 'RIGHT_TURN', label: 'TURN RIGHT' },
  { value: 'U_TURN', label: 'U-TURN' },
  { value: 'PARKING', label: 'PARK' },
  { value: 'STOPPING', label: 'STOP' },
  { value: 'CROSS', label: 'CROSS' },
];

const VEHICLE_TYPES = [
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'car', label: 'Car' },
  { value: 'bus', label: 'Bus' },
  { value: 'truck', label: 'Truck' },
  { value: 'tuk-tuk', label: 'Tuk-Tuk' },
  { value: 'any', label: 'Any' },
];

const REQUIRED_OBJECTS = [
  { value: 'helmet', label: 'Helmet' },
  { value: 'seatbelt', label: 'Seatbelt' },
  { value: 'phone', label: 'Phone' },
  { value: 'license_plate', label: 'License Plate' },
];

const DETECT_CONDITIONS = [
  { value: 'detected', label: 'Detected' },
  { value: 'not_detected', label: 'Not Detected' },
  { value: 'missing', label: 'Missing' },
  { value: 'invalid', label: 'Invalid' },
];

/** Cambodia workflow presets — align UI fields with ViolationRuleEngine keys. */
const RULE_PRESETS: Array<{
  match: RegExp;
  title: string;
  patch: Partial<RuleFormState>;
}> = [
  {
    match: /helmet|កាស/i,
    title: 'No Helmet (Motorcycle)',
    patch: {
      category: 'vehicle_equipment',
      detection_type: 'yolo',
      vehicle_type: 'motorcycle',
      required_object: 'helmet',
      detection_condition: 'not_detected',
      fine_khr: '41000',
      demerit_points: '1',
      legal_reference: 'Land Traffic Law — Safety (helmet)',
      description: 'Motorcycle rider detected without an approved safety helmet on a public road.',
      ocr_required: true,
      police_review_required: true,
    },
  },
  {
    match: /seat\s*belt|ខ្សែសុវត្ថិ/i,
    title: 'No Seatbelt',
    patch: {
      category: 'vehicle_equipment',
      detection_type: 'yolo',
      vehicle_type: 'car',
      required_object: 'seatbelt',
      detection_condition: 'not_detected',
      fine_khr: '41000',
      demerit_points: '1',
      legal_reference: 'Land Traffic Law — Safety (seatbelt)',
      description: 'Vehicle occupant detected without a fastened seatbelt.',
    },
  },
  {
    match: /no\s*entry|ហាមចូល/i,
    title: 'No Entry Violation',
    patch: {
      category: 'traffic_sign',
      detection_type: 'fusion',
      traffic_sign: 'NO_ENTRY',
      vehicle_action: 'ENTER',
      fine_khr: '61500',
      demerit_points: '2',
      legal_reference: 'Land Traffic Law — Prohibitory signs',
      description: 'Vehicle entered a road marked No Entry.',
    },
  },
  {
    match: /no\s*u[\s-]?turn|ហាមបត់ក្បាល/i,
    title: 'No U-Turn Violation',
    patch: {
      category: 'traffic_sign',
      detection_type: 'fusion',
      traffic_sign: 'NO_U_TURN',
      vehicle_action: 'U_TURN',
      fine_khr: '41000',
      demerit_points: '2',
      legal_reference: 'Land Traffic Law — Prohibitory signs',
      description: 'Vehicle performed a U-turn where prohibited.',
    },
  },
  {
    match: /left\s*turn|ហាមបត់ឆ្វេង/i,
    title: 'Illegal Left Turn',
    patch: {
      category: 'traffic_sign',
      detection_type: 'fusion',
      traffic_sign: 'NO_LEFT_TURN',
      vehicle_action: 'LEFT_TURN',
      fine_khr: '41000',
      demerit_points: '2',
      legal_reference: 'Land Traffic Law — Prohibitory signs',
      description: 'Vehicle turned left where prohibited by traffic sign.',
    },
  },
  {
    match: /right\s*turn|ហាមបត់ស្តាំ/i,
    title: 'Illegal Right Turn',
    patch: {
      category: 'traffic_sign',
      detection_type: 'fusion',
      traffic_sign: 'NO_RIGHT_TURN',
      vehicle_action: 'RIGHT_TURN',
      fine_khr: '41000',
      demerit_points: '2',
      legal_reference: 'Land Traffic Law — Prohibitory signs',
      description: 'Vehicle turned right where prohibited by traffic sign.',
    },
  },
  {
    match: /stop\s*sign|ផ្លាក\s*stop|^stop$/i,
    title: 'Failure to Stop',
    patch: {
      category: 'traffic_sign',
      detection_type: 'fusion',
      traffic_sign: 'STOP',
      vehicle_action: 'CROSS',
      fine_khr: '41000',
      demerit_points: '2',
      legal_reference: 'Land Traffic Law — Stop signs',
      description: 'Vehicle failed to stop at a Stop sign.',
    },
  },
  {
    match: /no\s*parking|ហាមចត/i,
    title: 'Illegal Parking',
    patch: {
      category: 'parking',
      detection_type: 'fusion',
      parking_zone: 'NO_PARKING',
      vehicle_status: 'PARKING',
      traffic_sign: 'NO_PARKING',
      vehicle_action: 'PARKING',
      fine_khr: '32800',
      demerit_points: '1',
      legal_reference: 'Land Traffic Law — Parking',
      description: 'Vehicle parked in a No Parking zone.',
    },
  },
  {
    match: /red\s*light|ភ្លើងក្រហម/i,
    title: 'Running Red Light',
    patch: {
      category: 'traffic_light',
      detection_type: 'yolo',
      light_state: 'RED',
      light_vehicle_action: 'CROSS_STOP_LINE',
      fine_khr: '82000',
      demerit_points: '3',
      legal_reference: 'Land Traffic Law — Traffic signals',
      description: 'Vehicle crossed the stop line while the traffic light was red.',
    },
  },
  {
    match: /speed|លឿនលើស/i,
    title: 'Speeding (above limit)',
    patch: {
      category: 'speed',
      detection_type: 'speed_sensor',
      speed_limit: '40',
      speed_operator: 'gt',
      fine_khr: '82000',
      demerit_points: '3',
      legal_reference: 'Land Traffic Law — Speed limits',
      description: 'Vehicle exceeded the posted speed limit.',
    },
  },
  {
    match: /phone|ទូរស័ព្ទ/i,
    title: 'Using Mobile Phone While Driving',
    patch: {
      category: 'vehicle_behavior',
      detection_type: 'yolo',
      vehicle_type: 'any',
      required_object: 'phone',
      detection_condition: 'detected',
      fine_khr: '41000',
      demerit_points: '2',
      legal_reference: 'Land Traffic Law — Distracted driving',
      description: 'Driver detected using a mobile phone while operating a vehicle.',
    },
  },
];

const SIGN_DEFAULT_ACTION: Record<string, string> = {
  NO_ENTRY: 'ENTER',
  STOP: 'CROSS',
  NO_PARKING: 'PARKING',
  NO_STOPPING: 'STOPPING',
  SPEED_LIMIT: 'ENTER',
  NO_LEFT_TURN: 'LEFT_TURN',
  NO_RIGHT_TURN: 'RIGHT_TURN',
  NO_U_TURN: 'U_TURN',
  ONE_WAY: 'ENTER',
  ROAD_CLOSED_ALL_USERS: 'ENTER',
};

function applyRuleNamePreset(title: string, current: RuleFormState): RuleFormState {
  const hit = RULE_PRESETS.find((p) => p.match.test(title.trim()));
  if (!hit) return { ...current, title };
  return {
    ...current,
    ...hit.patch,
    title: current.title.trim() || hit.title,
  };
}

function categoryDetectionDefault(category: RuleCategory): DetectionMethod {
  switch (category) {
    case 'speed':
      return 'speed_sensor';
    case 'vehicle_equipment':
    case 'vehicle_behavior':
    case 'traffic_light':
      return 'yolo';
    case 'other':
      return 'manual';
    default:
      return 'fusion';
  }
}

function nextRuleCode(rules: ViolationRule[]): string {
  let max = 0;
  for (const r of rules) {
    const digits = String(r.rule_code || '').replace(/\D/g, '');
    if (digits) max = Math.max(max, Number(digits));
  }
  return `VR${String(max + 1).padStart(3, '0')}`;
}

function emptyForm(code = 'VR001'): RuleFormState {
  return {
    rule_code: code,
    title: '',
    category: 'traffic_sign',
    detection_type: 'fusion',
    traffic_sign: 'NO_ENTRY',
    vehicle_action: 'ENTER',
    vehicle_type: 'motorcycle',
    required_object: 'helmet',
    detection_condition: 'not_detected',
    speed_limit: '40',
    speed_operator: 'gt',
    light_state: 'RED',
    light_vehicle_action: 'CROSS_STOP_LINE',
    parking_zone: 'NO_PARKING',
    vehicle_status: 'PARKING',
    lane_condition: 'WRONG_LANE',
    fine_khr: '60000',
    demerit_points: '2',
    warning_only: false,
    legal_reference: '',
    description: '',
    confidence_threshold: '0.85',
    ocr_required: true,
    police_review_required: true,
    save_original: true,
    save_detection: true,
    save_plate: true,
    save_ai_result: true,
    is_active: true,
  };
}

function cfg(rule: ViolationRule): Record<string, unknown> {
  return (rule.config && typeof rule.config === 'object') ? rule.config as Record<string, unknown> : {};
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function inferRuleCategory(rule: ViolationRule): RuleCategory {
  if (rule.category) return rule.category as RuleCategory;
  const sign = String(rule.sign_class_key || '').toLowerCase();
  const action = String(rule.prohibited_action || '').toLowerCase();
  if (sign === 'helmet' || action === 'no_helmet' || sign === 'seatbelt') return 'vehicle_equipment';
  if (sign === 'phone' || action === 'detected') return 'vehicle_behavior';
  if (sign.startsWith('speed_limit') || action.startsWith('speed_')) return 'speed';
  if (sign.startsWith('traffic_light') || action.includes('cross_stop')) return 'traffic_light';
  if (['no_parking', 'no_stopping', 'bus_stop', 'disabled_bay'].includes(sign)) return 'parking';
  if (action.includes('lane')) return 'lane_violation';
  return 'traffic_sign';
}

function ruleToForm(rule: ViolationRule): RuleFormState {
  const c = cfg(rule);
  const category = inferRuleCategory(rule);
  const save = (c.save_evidence && typeof c.save_evidence === 'object')
    ? c.save_evidence as Record<string, unknown>
    : {
        original: true,
        detection: true,
        plate: bool(c.save_evidence, true),
        ai_result: true,
      };

  const isEquipment = category === 'vehicle_equipment' || category === 'vehicle_behavior';
  const requiredObject = isEquipment
    ? str(c.required_object, String(rule.sign_class_key || 'helmet').toLowerCase())
    : str(c.required_object, 'helmet');
  const detectionCondition = isEquipment
    ? str(
        c.detection_condition,
        String(rule.prohibited_action || '').toLowerCase() === 'no_helmet'
          || String(rule.prohibited_action || '').toLowerCase() === 'not_detected'
          ? 'not_detected'
          : 'detected',
      )
    : str(c.detection_condition, 'not_detected');

  return {
    rule_code: rule.rule_code || '',
    title: rule.title,
    category,
    detection_type: (rule.detection_type || categoryDetectionDefault(category)) as DetectionMethod,
    traffic_sign: str(c.traffic_sign, isEquipment ? 'NO_ENTRY' : (rule.sign_class_key || 'NO_ENTRY')),
    vehicle_action: str(
      c.vehicle_action,
      isEquipment ? 'ENTER' : (rule.prohibited_action || 'ENTER').toUpperCase(),
    ),
    vehicle_type: str(c.vehicle_type, 'motorcycle'),
    required_object: requiredObject,
    detection_condition: detectionCondition,
    speed_limit: String(c.speed_limit ?? 40),
    speed_operator: str(c.comparison_operator, 'gt'),
    light_state: str(c.traffic_light_state, 'RED'),
    light_vehicle_action: str(c.vehicle_action_light, 'CROSS_STOP_LINE'),
    parking_zone: str(c.parking_zone, category === 'parking' ? (rule.sign_class_key || 'NO_PARKING') : 'NO_PARKING'),
    vehicle_status: str(c.vehicle_status, category === 'parking' ? (rule.prohibited_action || 'PARKING') : 'PARKING'),
    lane_condition: str(c.lane_condition, 'WRONG_LANE'),
    fine_khr: String(usdToKhr(Number(rule.default_fine_amount ?? 0))),
    demerit_points: String(rule.demerit_points ?? 0),
    warning_only: Boolean(rule.warning_only),
    legal_reference: rule.legal_reference || '',
    description: rule.description || '',
    confidence_threshold: String(c.confidence_threshold ?? 0.85),
    ocr_required: bool(c.ocr_required, true),
    police_review_required: bool(c.police_review_required, true),
    save_original: bool(save.original, true),
    save_detection: bool(save.detection, true),
    save_plate: bool(save.plate, true),
    save_ai_result: bool(save.ai_result, true),
    is_active: rule.is_active,
  };
}

function deriveEngineKeys(form: RuleFormState): {
  sign_class_key: string;
  prohibited_action: string;
  violation_type: string;
} {
  switch (form.category) {
    case 'traffic_sign': {
      const sign = form.traffic_sign;
      let violationType = sign;
      if (sign === 'NO_LEFT_TURN') violationType = 'ILLEGAL_LEFT_TURN';
      else if (sign === 'NO_RIGHT_TURN') violationType = 'ILLEGAL_RIGHT_TURN';
      else if (sign === 'NO_U_TURN') violationType = 'ILLEGAL_U_TURN';
      else if (sign.startsWith('ROAD_CLOSED')) violationType = 'ROAD_CLOSED';
      return {
        sign_class_key: sign,
        prohibited_action: form.vehicle_action,
        violation_type: violationType,
      };
    }
    case 'vehicle_behavior':
    case 'vehicle_equipment': {
      const obj = form.required_object.toLowerCase();
      const missing = ['not_detected', 'missing'].includes(form.detection_condition);
      if (obj === 'helmet' && missing) {
        return { sign_class_key: 'helmet', prohibited_action: 'no_helmet', violation_type: 'NO_HELMET' };
      }
      return {
        sign_class_key: obj,
        prohibited_action: form.detection_condition.toUpperCase(),
        violation_type: `${obj.toUpperCase()}_${form.detection_condition.toUpperCase()}`,
      };
    }
    case 'speed':
      return {
        sign_class_key: `SPEED_LIMIT_${form.speed_limit || '0'}`,
        prohibited_action: form.speed_operator === 'gte' ? 'SPEED_GTE' : form.speed_operator === 'lt' ? 'SPEED_LT' : 'SPEED_GT',
        violation_type: 'SPEEDING',
      };
    case 'traffic_light':
      return {
        sign_class_key: `TRAFFIC_LIGHT_${form.light_state}`,
        prohibited_action: form.light_vehicle_action,
        violation_type: 'RED_LIGHT',
      };
    case 'parking':
      return {
        sign_class_key: form.parking_zone,
        prohibited_action: form.vehicle_status,
        violation_type: form.parking_zone.includes('STOP') ? 'NO_STOPPING' : 'NO_PARKING',
      };
    case 'lane_violation':
      return {
        sign_class_key: 'LANE',
        prohibited_action: form.lane_condition,
        violation_type: 'LANE_VIOLATION',
      };
    default:
      return {
        sign_class_key: 'OTHER',
        prohibited_action: 'VIOLATION',
        violation_type: 'OTHER',
      };
  }
}

function formatTypeLabel(value: string) {
  return (value || '—').replace(/_/g, ' ');
}

function SectionTitle({ step, children }: { step: number; children: string }) {
  return (
    <h3 className="rule-popup__section-title">
      <span className="rule-popup__section-step" aria-hidden>
        {step}
      </span>
      <span className="rule-popup__section-label">{children}</span>
    </h3>
  );
}

export function ViolationRulesPage() {
  const { t, locale } = useLanguage();
  const [rules, setRules] = useState<ViolationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState<RuleFormState>(() => emptyForm());
  const [editing, setEditing] = useState<ViolationRule | null>(null);
  const [deleteRule, setDeleteRule] = useState<ViolationRule | null>(null);
  const [viewRule, setViewRule] = useState<ViolationRule | null>(null);
  const [errors, setErrors] = useState<Partial<Record<RuleFormField, string>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await violationsAPI.getRules({ all: true }));
    } catch {
      toast.error(t('violationRules.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rules;
    const q = search.toLowerCase();
    return rules.filter((r) =>
      r.title.toLowerCase().includes(q)
      || r.sign_class_key.toLowerCase().includes(q)
      || r.prohibited_action.toLowerCase().includes(q)
      || r.violation_type.toLowerCase().includes(q)
      || (r.rule_code || '').toLowerCase().includes(q)
      || (r.legal_reference || '').toLowerCase().includes(q),
    );
  }, [rules, search]);

  const pagination = usePagination(filtered);

  const counts = useMemo(() => ({
    total: rules.length,
    active: rules.filter((r) => r.is_active).length,
    inactive: rules.filter((r) => !r.is_active).length,
    types: new Set(rules.map((r) => r.violation_type)).size,
  }), [rules]);

  const setField = <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => {
    setForm((f) => {
      let next: RuleFormState = { ...f, [key]: value };
      if (key === 'category') {
        const cat = value as RuleCategory;
        next.detection_type = categoryDetectionDefault(cat);
      }
      if (key === 'traffic_sign') {
        const sign = String(value);
        const action = SIGN_DEFAULT_ACTION[sign];
        if (action) next.vehicle_action = action;
      }
      return next;
    });
    setErrors((e) => {
      const next = { ...e };
      if (key === 'title') delete next.title;
      if (key === 'category') delete next.category;
      if (key === 'fine_khr') delete next.fine_khr;
      delete next.conditions;
      return next;
    });
  };

  const applyTitleWorkflow = (rawTitle: string) => {
    setForm((current) => applyRuleNamePreset(rawTitle, current));
    setErrors((e) => {
      const next = { ...e };
      delete next.title;
      delete next.category;
      delete next.conditions;
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(nextRuleCode(rules)));
    setErrors({});
    setOpen(true);
  };

  const openEdit = (rule: ViolationRule) => {
    setEditing(rule);
    setForm(ruleToForm(rule));
    setErrors({});
    setOpen(true);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setErrors({});
  };

  const validate = (): boolean => {
    const next: Partial<Record<RuleFormField, string>> = {};
    if (!form.rule_code.trim()) next.title = 'Rule code cannot be empty';
    if (!form.title.trim()) next.title = 'Rule name is required';
    else {
      const dup = rules.some(
        (r) => r.title.trim().toLowerCase() === form.title.trim().toLowerCase()
          && (!editing || r.id !== editing.id),
      );
      if (dup) next.title = 'Rule name already exists';
    }
    if (!form.category) next.category = 'Please select violation category';

    if (form.category === 'traffic_sign' && (!form.traffic_sign || !form.vehicle_action)) {
      next.conditions = 'Select traffic sign and vehicle action';
    }
    if ((form.category === 'vehicle_behavior' || form.category === 'vehicle_equipment')
      && (!form.vehicle_type || !form.required_object || !form.detection_condition)) {
      next.conditions = 'Select vehicle type, required object, and detection condition';
    }
    if (form.category === 'speed' && (!form.speed_limit || Number(form.speed_limit) <= 0)) {
      next.conditions = 'Enter a valid speed limit (km/h)';
    }
    if (form.category === 'traffic_light' && (!form.light_state || !form.light_vehicle_action)) {
      next.conditions = 'Select traffic light state and vehicle action';
    }
    if (form.category === 'parking' && (!form.parking_zone || !form.vehicle_status)) {
      next.conditions = 'Select parking zone and vehicle status';
    }

    if (!form.warning_only) {
      const fine = Number(form.fine_khr);
      if (!form.fine_khr.trim()) next.fine_khr = 'Fine is required';
      else if (!Number.isFinite(fine) || fine <= 0) next.fine_khr = 'Fine must be greater than 0';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error(t('common.formIncomplete') || 'Please fix the highlighted fields');
      return;
    }
    const derived = deriveEngineKeys(form);
    const payload = {
      rule_code: form.rule_code.trim(),
      category: form.category,
      detection_type: form.detection_type,
      priority: 3,
      title: form.title.trim(),
      sign_class_key: derived.sign_class_key,
      prohibited_action: derived.prohibited_action,
      violation_type: derived.violation_type,
      description: form.description.trim(),
      legal_reference: form.legal_reference.trim(),
      default_fine_amount: form.warning_only ? 0 : khrToUsd(Number(form.fine_khr) || 0),
      demerit_points: Number(form.demerit_points) || 0,
      warning_only: form.warning_only,
      auto_generate_fine: !form.warning_only,
      is_active: form.is_active,
      config: {
        traffic_sign: form.traffic_sign,
        vehicle_action: form.vehicle_action,
        vehicle_type: form.vehicle_type,
        required_object: form.required_object,
        detection_condition: form.detection_condition,
        speed_limit: Number(form.speed_limit) || null,
        comparison_operator: form.speed_operator,
        traffic_light_state: form.light_state,
        vehicle_action_light: form.light_vehicle_action,
        parking_zone: form.parking_zone,
        vehicle_status: form.vehicle_status,
        lane_condition: form.lane_condition,
        confidence_threshold: Number(form.confidence_threshold),
        ocr_required: form.ocr_required,
        police_review_required: form.police_review_required,
        save_evidence: {
          original: form.save_original,
          detection: form.save_detection,
          plate: form.save_plate,
          ai_result: form.save_ai_result,
        },
      },
    };

    setSaving(true);
    try {
      if (editing) {
        await violationsAPI.updateRule(editing.id, payload);
        toast.success(t('violationRules.updated'));
      } else {
        await violationsAPI.createRule(payload);
        toast.success(t('violationRules.created'));
      }
      setOpen(false);
      setEditing(null);
      setErrors({});
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (editing ? t('violationRules.updateFailed') : t('violationRules.createFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRule) return;
    try {
      await violationsAPI.deleteRule(deleteRule.id);
      toast.success(t('violationRules.deleted'));
      setDeleteRule(null);
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('violationRules.deleteFailed'));
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await violationsAPI.seedRules();
      toast.success(t('violationRules.seeded').replace('{count}', String(result.created ?? 0)));
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('violationRules.seedFailed'));
    } finally {
      setSeeding(false);
    }
  };

  const conditionPreview = useMemo(() => {
    if (form.category === 'traffic_sign') {
      return `${formatTypeLabel(form.traffic_sign)} + ${formatTypeLabel(form.vehicle_action)}`;
    }
    if (form.category === 'vehicle_behavior' || form.category === 'vehicle_equipment') {
      return `${formatTypeLabel(form.vehicle_type)} · ${formatTypeLabel(form.required_object)} · ${formatTypeLabel(form.detection_condition)}`;
    }
    if (form.category === 'speed') {
      const op = form.speed_operator === 'gte' ? '≥' : form.speed_operator === 'lt' ? '<' : '>';
      return `Speed ${op} ${form.speed_limit || '—'} km/h`;
    }
    if (form.category === 'traffic_light') {
      return `${formatTypeLabel(form.light_state)} light + ${formatTypeLabel(form.light_vehicle_action)}`;
    }
    if (form.category === 'parking') {
      return `${formatTypeLabel(form.parking_zone)} · ${formatTypeLabel(form.vehicle_status)}`;
    }
    return formatTypeLabel(form.category);
  }, [form]);

  const workflowHint = useMemo(() => {
    if (form.category === 'vehicle_equipment' || form.category === 'vehicle_behavior') {
      return 'Workflow: YOLO detects vehicle/object → Rule Engine → Officer review → Fine.';
    }
    if (form.category === 'traffic_sign') {
      return 'Workflow: YOLO detects sign + vehicle action → Rule Engine → Officer review → Fine.';
    }
    if (form.category === 'traffic_light') {
      return 'Workflow: YOLO detects light state + vehicle crossing → Officer review → Fine.';
    }
    return 'Workflow: AI Detection → Violation Rule Engine → Officer Review → Fine → Driver notify.';
  }, [form.category]);

  return (
    <div className="enforcement-page enforcement-page--roads dashboard-page--roads enforcement-page--violation-rules">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Scale size={14} /></span>
              {t('violationRules.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('violationRules.title')}</h1>
            <p className="enforcement-page__subtitle">{t('violationRules.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--slate"
              onClick={() => void handleSeed()}
              disabled={seeding}
            >
              <RefreshCw size={16} className={seeding ? 'animate-spin' : undefined} />
              {t('violationRules.seedDefaults')}
            </button>
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--slate" onClick={openCreate}>
              <Plus size={16} /> {t('violationRules.add')}
            </button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--slate">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--slate"><Scale size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.total}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--slate">{t('violationRules.statTotal')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><CheckCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.active}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('violationRules.statActive')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--amber">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber"><XCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.inactive}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--amber">{t('violationRules.statInactive')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><Hash size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.types}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('violationRules.statTypes')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__toolbar">
        <div className="enforcement-page__search-wrap roads-page__search-wrap">
          <Search size={14} className="enforcement-page__search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('violationRules.searchPlaceholder')}
            className="enforcement-page__search"
          />
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--roads">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid violation-rules-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th violation-rules-page__col violation-rules-page__col--title text-left">
                  {t('violationRules.colTitle')}
                </TableHead>
                <TableHead className="enforcement-page__th violation-rules-page__col violation-rules-page__col--sign text-left">
                  {t('violationRules.colSign')}
                </TableHead>
                <TableHead className="enforcement-page__th violation-rules-page__col violation-rules-page__col--action text-left">
                  {t('violationRules.colAction')}
                </TableHead>
                <TableHead className="enforcement-page__th violation-rules-page__col violation-rules-page__col--type text-left">
                  {t('violationRules.colType')}
                </TableHead>
                <TableHead className="enforcement-page__th violation-rules-page__col violation-rules-page__col--fine text-left">
                  {t('violationRules.colFine')}
                </TableHead>
                <TableHead className="enforcement-page__th violation-rules-page__col violation-rules-page__col--status text-left">
                  {t('users.colStatus')}
                </TableHead>
                <TableHead className="enforcement-page__th violation-rules-page__col violation-rules-page__col--actions text-left">
                  {t('violationRules.colActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton roads-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  tone="violet"
                  icon={<Scale size={28} />}
                  title={t('violationRules.empty')}
                  subtitle={t('violationRules.emptyHint')}
                  action={{ label: t('violationRules.add'), onClick: openCreate, icon: <Plus size={15} /> }}
                />
              ) : pagination.pageItems.map((rule) => (
                <TableRow key={rule.id} className="enforcement-page__table-row">
                  <TableCell className="violation-rules-page__col violation-rules-page__col--title whitespace-normal">
                    <div className="roads-page__name-cell">
                      <div className="roads-page__road-icon" aria-hidden>
                        <Scale size={15} strokeWidth={1.75} />
                      </div>
                      <div className="mgmt-table__stack">
                        <p className="enforcement-page__cell-primary roads-page__truncate" title={rule.title}>
                          {rule.title}
                        </p>
                        {rule.legal_reference ? (
                          <p className="enforcement-page__cell-secondary roads-page__region roads-page__truncate" title={rule.legal_reference}>
                            {rule.legal_reference}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="violation-rules-page__col violation-rules-page__col--sign">
                    <span className="enforcement-page__code-pill" title={rule.sign_class_key}>
                      {rule.sign_class_key}
                    </span>
                  </TableCell>
                  <TableCell className="violation-rules-page__col violation-rules-page__col--action">
                    <span className="enforcement-page__code-pill enforcement-page__code-pill--action" title={rule.prohibited_action}>
                      {formatTypeLabel(rule.prohibited_action)}
                    </span>
                  </TableCell>
                  <TableCell className="violation-rules-page__col violation-rules-page__col--type">
                    <span className="enforcement-page__cell-body roads-page__truncate" title={rule.violation_type}>
                      {formatTypeLabel(rule.violation_type)}
                    </span>
                  </TableCell>
                  <TableCell className="violation-rules-page__col violation-rules-page__col--fine">
                    <span className="fines-table__amount">
                      <RielIcon size={12} aria-hidden />
                      {formatAppCurrency(locale, Number(rule.default_fine_amount))}
                    </span>
                  </TableCell>
                  <TableCell className="violation-rules-page__col violation-rules-page__col--status">
                    <span
                      className="enforcement-page__badge"
                      style={{
                        background: rule.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: rule.is_active ? '#059669' : '#DC2626',
                      }}
                    >
                      {rule.is_active ? t('violationRules.statusActive') : t('violationRules.statusInactive')}
                    </span>
                  </TableCell>
                  <TableCell className="violation-rules-page__col violation-rules-page__col--actions">
                    <CrudRowActions
                      onView={() => setViewRule(rule)}
                      onEdit={() => openEdit(rule)}
                      onDelete={() => setDeleteRule(rule)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} />
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent accent="violet" className="ct-form-dialog rule-popup-dialog max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--violet">
                {editing ? <Pencil size={15} /> : <Plus size={15} />}
              </div>
              <span className="enforcement-page__dialog-title">
                {editing ? t('violationRules.edit') : 'Create Violation Rule'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="rule-popup__body">
            <FormErrorBanner message={Object.keys(errors).length ? (t('common.formIncomplete') || 'Please fix the highlighted fields') : null} />

            <section className="rule-popup__section">
              <SectionTitle step={1}>Rule Information</SectionTitle>
              <div className="rule-popup__field">
                <Label className="enforcement-page__form-label">Rule Name *</Label>
                <Input
                  className={errors.title ? 'ct-field--invalid' : ''}
                  placeholder="e.g. No Helmet (Motorcycle)"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  onBlur={(e) => applyTitleWorkflow(e.target.value)}
                  aria-invalid={Boolean(errors.title)}
                />
                <FieldError message={errors.title} />
              </div>
              <div className="rule-popup__presets-wrap">
                <span className="rule-popup__presets-label">Quick presets</span>
                <div className="rule-popup__presets" role="group" aria-label="Common Cambodia rules">
                  {RULE_PRESETS.slice(0, 6).map((preset) => {
                    const active = form.title.trim().toLowerCase() === preset.title.toLowerCase();
                    return (
                      <button
                        key={preset.title}
                        type="button"
                        className={`rule-popup__preset-chip${active ? ' is-active' : ''}`}
                        onClick={() => {
                          setForm((current) => applyRuleNamePreset(preset.title, {
                            ...current,
                            title: preset.title,
                          }));
                          setErrors({});
                        }}
                      >
                        {preset.title}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rule-popup__field">
                <Label className="enforcement-page__form-label">Violation Category *</Label>
                <Select value={form.category} onValueChange={(v) => setField('category', v as RuleCategory)}>
                  <SelectTrigger className={errors.category ? 'ct-field--invalid' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.category} />
              </div>
            </section>

            <section className="rule-popup__section">
              <SectionTitle step={2}>AI Detection Condition</SectionTitle>
              {errors.conditions ? <FieldError message={errors.conditions} /> : null}
              <p className="rule-popup__hint">{workflowHint}</p>
              <div className="rule-popup__preview" role="status">
                <span className="rule-popup__preview-label">Condition</span>
                <code className="rule-popup__preview-value">{conditionPreview}</code>
              </div>

            {form.category === 'traffic_sign' ? (
              <div className="rule-popup__grid rule-popup__grid--2">
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Traffic Sign Class *</Label>
                  <Select value={form.traffic_sign} onValueChange={(v) => setField('traffic_sign', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SIGN_CLASSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Vehicle Action *</Label>
                  <Select value={form.vehicle_action} onValueChange={(v) => setField('vehicle_action', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_ACTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {(form.category === 'vehicle_behavior' || form.category === 'vehicle_equipment') ? (
              <div className="rule-popup__grid rule-popup__grid--3">
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Vehicle Type *</Label>
                  <Select value={form.vehicle_type} onValueChange={(v) => setField('vehicle_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((v) => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Required Object *</Label>
                  <Select value={form.required_object} onValueChange={(v) => setField('required_object', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUIRED_OBJECTS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Detection Condition *</Label>
                  <Select value={form.detection_condition} onValueChange={(v) => setField('detection_condition', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DETECT_CONDITIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {form.category === 'speed' ? (
              <div className="rule-popup__grid rule-popup__grid--2">
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Speed Limit (km/h) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.speed_limit}
                    onChange={(e) => setField('speed_limit', e.target.value)}
                  />
                </div>
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Operator *</Label>
                  <Select value={form.speed_operator} onValueChange={(v) => setField('speed_operator', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gt">&gt;</SelectItem>
                      <SelectItem value="gte">&gt;=</SelectItem>
                      <SelectItem value="lt">&lt;</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {form.category === 'traffic_light' ? (
              <div className="rule-popup__grid rule-popup__grid--2">
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Traffic Light State *</Label>
                  <Select value={form.light_state} onValueChange={(v) => setField('light_state', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RED">Red</SelectItem>
                      <SelectItem value="YELLOW">Yellow</SelectItem>
                      <SelectItem value="GREEN">Green</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Vehicle Action *</Label>
                  <Select value={form.light_vehicle_action} onValueChange={(v) => setField('light_vehicle_action', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CROSS_STOP_LINE">Cross Stop Line</SelectItem>
                      <SelectItem value="CONTINUE">Continue Driving</SelectItem>
                      <SelectItem value="STOP">Stop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {form.category === 'parking' ? (
              <div className="rule-popup__grid rule-popup__grid--2">
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Parking Zone *</Label>
                  <Select value={form.parking_zone} onValueChange={(v) => setField('parking_zone', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO_PARKING">No Parking</SelectItem>
                      <SelectItem value="NO_STOPPING">No Stopping</SelectItem>
                      <SelectItem value="BUS_STOP">Bus Stop</SelectItem>
                      <SelectItem value="DISABLED_BAY">Disabled Bay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rule-popup__field">
                  <Label className="enforcement-page__form-label">Vehicle Status *</Label>
                  <Select value={form.vehicle_status} onValueChange={(v) => setField('vehicle_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PARKING">Parked</SelectItem>
                      <SelectItem value="STOPPING">Stopped</SelectItem>
                      <SelectItem value="STANDING">Standing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {form.category === 'lane_violation' ? (
              <div className="rule-popup__field">
                <Label className="enforcement-page__form-label">Lane Condition *</Label>
                <Select value={form.lane_condition} onValueChange={(v) => setField('lane_condition', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WRONG_LANE">Wrong lane</SelectItem>
                    <SelectItem value="SOLID_LINE_CROSS">Cross solid line</SelectItem>
                    <SelectItem value="BUS_LANE">Bus lane misuse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {form.category === 'other' ? (
              <p className="rule-popup__hint">
                Custom rule — set the name and fine. Engine keys default to OTHER / VIOLATION.
              </p>
            ) : null}
            </section>

            <section className="rule-popup__section">
              <SectionTitle step={3}>Penalty</SectionTitle>
              <div className="rule-popup__field">
                <Label className="enforcement-page__form-label">Fine Amount (KHR) *</Label>
                <Input
                  className={errors.fine_khr ? 'ct-field--invalid' : ''}
                  type="number"
                  min={0}
                  step={100}
                  value={form.fine_khr}
                  onChange={(e) => setField('fine_khr', e.target.value)}
                />
                <FieldError message={errors.fine_khr} />
              </div>

              <label className="rule-popup__toggle">
                <div className="rule-popup__toggle-copy">
                  <span className="rule-popup__toggle-title">
                    {form.is_active ? t('violationRules.statusActive') : t('violationRules.statusInactive')}
                  </span>
                  <span className="rule-popup__toggle-hint">
                    Inactive rules are skipped by the AI engine
                  </span>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setField('is_active', v)}
                />
              </label>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : null}
              {saving ? t('common.saving') : 'Save Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRule} onOpenChange={(v) => !v && setDeleteRule(null)}>
        <DialogContent accent="danger" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="enforcement-page__dialog-title">{t('violationRules.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="enforcement-page__dialog-text">
            {t('violationRules.deleteConfirm').replace('{name}', deleteRule?.title || '')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRule(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntityViewDialog
        open={!!viewRule}
        onOpenChange={(v) => !v && setViewRule(null)}
        title={t('violationRules.viewTitle')}
        accent="violet"
        onEdit={viewRule ? () => openEdit(viewRule) : undefined}
      >
        {viewRule ? (
          <>
            <EntityDetailField label="Rule Code" value={viewRule.rule_code || '—'} />
            <EntityDetailField label={t('violationRules.colTitle')} value={viewRule.title} />
            <EntityDetailField label="Category" value={formatTypeLabel(viewRule.category || 'traffic_sign')} />
            <EntityDetailField label={t('violationRules.colSign')} value={viewRule.sign_class_key} />
            <EntityDetailField label={t('violationRules.colAction')} value={formatTypeLabel(viewRule.prohibited_action)} />
            <EntityDetailField label={t('violationRules.colType')} value={formatTypeLabel(viewRule.violation_type)} />
            <EntityDetailField
              label={t('violationRules.colFine')}
              value={formatAppCurrency(locale, Number(viewRule.default_fine_amount))}
            />
            <EntityDetailField label={t('violationRules.demeritPoints')} value={String(viewRule.demerit_points ?? 0)} />
            <EntityDetailField label={t('violationRules.legalReference')} value={viewRule.legal_reference || '—'} />
            <EntityDetailField label={t('violationRules.description')} value={viewRule.description || '—'} />
            <EntityDetailField
              label={t('users.colStatus')}
              value={viewRule.is_active ? t('violationRules.statusActive') : t('violationRules.statusInactive')}
            />
          </>
        ) : null}
      </EntityViewDialog>
    </div>
  );
}
