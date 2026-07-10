export type Locale = 'en' | 'km';

export interface Dictionary {
  common: {
    appName: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    search: string;
    submit: string;
    back: string;
    yes: string;
    no: string;
    close: string;
    confirm: string;
    welcome: string;
  };
  auth: {
    login: string;
    logout: string;
    email: string;
    password: string;
    forgotPassword: string;
    register: string;
    rememberMe: string;
    forgotPasswordTitle: string;
    forgotPasswordInstructions: string;
    sendResetLink: string;
    resetLinkSent: string;
    backToLogin: string;
    resetPasswordTitle: string;
    resetPasswordInstructions: string;
    resetPassword: string;
    newPassword: string;
    confirmPassword: string;
    newPasswordRequired: string;
    confirmPasswordRequired: string;
    passwordMismatch: string;
    passwordMinLength: string;
    changePasswordTitle: string;
    changePasswordInstructions: string;
    changePassword: string;
    currentPassword: string;
    currentPasswordRequired: string;
    passwordChanged: string;
    newPasswordMustDiffer: string;
    emailVerificationTitle: string;
    emailVerificationInstructions: string;
    emailVerified: string;
    emailNotVerified: string;
    sendVerificationEmail: string;
    verificationEmailSent: string;
    verifyingEmail: string;
  };
  nav: {
    dashboard: string;
    users: string;
    officers: string;
    drivers: string;
    vehicles: string;
    cameras: string;
    violations: string;
    fines: string;
    appeals: string;
    reports: string;
    settings: string;
    roles: string;
    permissions: string;
    policeStations: string;
    aiModels: string;
    trafficSigns: string;
    analytics: string;
    auditLogs: string;
    notifications: string;
    backup: string;
    evidence: string;
    profile: string;
  };
  theme: {
    light: string;
    dark: string;
    system: string;
    switchToLight: string;
    switchToDark: string;
  };
  locale: {
    en: string;
    km: string;
    switchTo: string;
    current: string;
  };
  portal: {
    subtitle: string;
    badge: string;
    demoTitle: string;
    demoSubtitle: string;
  };
  profile: {
    title: string;
    subtitle: string;
    firstName: string;
    lastName: string;
    phone: string;
    preferredLocale: string;
    bio: string;
    address: string;
    province: string;
    district: string;
    dateOfBirth: string;
    saveProfile: string;
    profileUpdated: string;
    loadError: string;
    avatar: string;
    avatarInitials: string;
    uploadAvatar: string;
    removeAvatar: string;
    avatarUploaded: string;
    avatarRemoved: string;
    avatarInvalidType: string;
    avatarTooLarge: string;
  };
  errors: {
    generic: string;
    notFound: string;
    unauthorized: string;
    network: string;
    validation: string;
  };
  status: {
    active: string;
    inactive: string;
    pending: string;
    approved: string;
    rejected: string;
  };
  management: {
    list: string;
    create: string;
    detail: string;
    actions: string;
    filters: string;
    resetFilters: string;
    noResults: string;
    confirmDelete: string;
    deleteSuccess: string;
    saveSuccess: string;
    loadError: string;
    totalRecords: string;
    page: string;
    rowsPerPage: string;
    previous: string;
    next: string;
    export: string;
    import: string;
    refresh: string;
    viewDetails: string;
    createdAt: string;
    updatedAt: string;
  };
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** @deprecated Use Dictionary */
export type EnDictionary = Dictionary;
