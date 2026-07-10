import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { OfficerProfileRecord, UpdateOfficerProfilePayload, UpdateProfilePayload, User, UserProfile } from '@camtraffic/types';
import { AvatarUpload } from './AvatarUpload';

interface OfficerProfilePageProps {
  user: User;
  onLoadProfile: () => Promise<UserProfile>;
  onUpdateProfile: (payload: UpdateProfilePayload) => Promise<{ profile: UserProfile; message: string }>;
  onUploadAvatar: (file: File) => Promise<{ avatar_url: string | null; message: string }>;
  onDeleteAvatar: () => Promise<{ avatar_url: string | null; message: string }>;
  onLoadOfficerProfile: () => Promise<OfficerProfileRecord>;
  onUpdateOfficerProfile: (
    payload: UpdateOfficerProfilePayload,
  ) => Promise<{ profile: OfficerProfileRecord; message: string }>;
  securitySection: ReactNode;
}

export function OfficerProfilePage({
  user,
  onLoadProfile,
  onUpdateProfile,
  onUploadAvatar,
  onDeleteAvatar,
  onLoadOfficerProfile,
  onUpdateOfficerProfile,
  securitySection,
}: OfficerProfilePageProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [officerProfile, setOfficerProfile] = useState<OfficerProfileRecord | null>(null);
  const [booting, setBooting] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [savingOfficer, setSavingOfficer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [locale, setLocale] = useState<'en' | 'km'>('en');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [rank, setRank] = useState('');

  useEffect(() => {
    async function bootstrap() {
      try {
        const [userProfile, assignment] = await Promise.all([onLoadProfile(), onLoadOfficerProfile()]);
        setProfile(userProfile);
        setOfficerProfile(assignment);
        setFirstName(userProfile.first_name);
        setLastName(userProfile.last_name);
        setPhone(userProfile.phone);
        setLocale(userProfile.locale);
        setBio(userProfile.bio);
        setAddress(userProfile.address);
        setProvince(userProfile.province);
        setDistrict(userProfile.district);
        setDateOfBirth(userProfile.date_of_birth ?? '');
        setRank(assignment.rank);
      } catch {
        setErrorMessage(t.profile.loadError);
      } finally {
        setBooting(false);
      }
    }

    void bootstrap();
  }, [onLoadOfficerProfile, onLoadProfile, t.profile.loadError]);

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUser(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onUpdateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        locale,
        bio: bio.trim(),
        address: address.trim(),
        province: province.trim(),
        district: district.trim(),
        date_of_birth: dateOfBirth || null,
      });
      setProfile(result.profile);
      setSuccessMessage(result.message);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setSavingUser(false);
    }
  }

  async function handleOfficerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingOfficer(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onUpdateOfficerProfile({ rank: rank.trim() });
      setOfficerProfile(result.profile);
      setSuccessMessage(result.message);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setSavingOfficer(false);
    }
  }

  if (booting) {
    return (
      <Card title={t.profile.title} subtitle="Task 073 — Officer profile">
        <p>{t.common.loading}</p>
      </Card>
    );
  }

  if (!profile || !officerProfile) {
    return (
      <Card title={t.profile.title} subtitle="Task 073 — Officer profile">
        <p className="auth-form__error">{errorMessage ?? t.profile.loadError}</p>
      </Card>
    );
  }

  return (
    <div className="officer-profile-page">
      <Card title={t.profile.title} subtitle="Task 073 — Personal profile and account settings">
        <form className="auth-form" onSubmit={handleUserSubmit}>
          <p className="auth-form__hint">{t.profile.subtitle}</p>
          <AvatarUpload
            avatarUrl={profile.avatar_url ?? null}
            onUpload={onUploadAvatar}
            onRemove={onDeleteAvatar}
            onAvatarChange={(avatarUrl) => setProfile((current) => (current ? { ...current, avatar_url: avatarUrl } : current))}
          />
          <Input label={t.auth.email} name="email" value={profile.email} disabled />
          <Input
            label={t.profile.firstName}
            name="first_name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
          <Input
            label={t.profile.lastName}
            name="last_name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
          <Input label={t.profile.phone} name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <label className="auth-form__field">
            <span className="auth-form__label">{t.profile.preferredLocale}</span>
            <select
              className="auth-form__select"
              name="locale"
              value={locale}
              onChange={(event) => setLocale(event.target.value as 'en' | 'km')}
            >
              <option value="en">{t.locale.en}</option>
              <option value="km">{t.locale.km}</option>
            </select>
          </label>
          <Input label={t.profile.bio} name="bio" value={bio} onChange={(event) => setBio(event.target.value)} />
          <Input label={t.profile.address} name="address" value={address} onChange={(event) => setAddress(event.target.value)} />
          <Input label={t.profile.province} name="province" value={province} onChange={(event) => setProvince(event.target.value)} />
          <Input label={t.profile.district} name="district" value={district} onChange={(event) => setDistrict(event.target.value)} />
          <Input
            type="date"
            label={t.profile.dateOfBirth}
            name="date_of_birth"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
          />
          <Button type="submit" isLoading={savingUser}>
            {t.profile.saveProfile}
          </Button>
        </form>
      </Card>

      <Card title="Officer assignment" subtitle="Station assignment and service details">
        <form className="auth-form" onSubmit={handleOfficerSubmit}>
          <Input label="Badge number" name="badge_number" value={officerProfile.badge_number} disabled />
          <Input label="Rank" name="rank" value={rank} onChange={(event) => setRank(event.target.value)} />
          <Input
            label="Hire date"
            name="hire_date"
            type="date"
            value={officerProfile.hire_date ?? ''}
            disabled
          />
          <Input label="Police station" name="station_name" value={officerProfile.station_name} disabled />
          <Input label="Station code" name="station_code" value={officerProfile.station_code} disabled />
          <Input label="Province" name="station_province" value={officerProfile.station_province} disabled />
          <Input label="Station address" name="station_address" value={officerProfile.station_address} disabled />
          <p className="auth-form__hint">
            Account: {user.email} · {officerProfile.is_active ? 'Active' : 'Inactive'}
          </p>
          <Button type="submit" isLoading={savingOfficer}>
            Save officer details
          </Button>
        </form>
      </Card>

      {securitySection}

      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
      {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}
    </div>
  );
}
