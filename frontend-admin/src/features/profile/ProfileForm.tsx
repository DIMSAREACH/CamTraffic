import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input, useTranslation } from '@camtraffic/ui';
import type { UpdateProfilePayload, UserProfile } from '@camtraffic/types';
import { AvatarUpload } from './AvatarUpload';

interface ProfileFormProps {
  onLoad: () => Promise<UserProfile>;
  onSubmit: (payload: UpdateProfilePayload) => Promise<string>;
  onUploadAvatar: (file: File) => Promise<{ avatar_url: string | null; message: string }>;
  onDeleteAvatar: () => Promise<{ avatar_url: string | null; message: string }>;
  onAvatarChange?: (avatarUrl: string | null) => void;
}

export function ProfileForm({
  onLoad,
  onSubmit,
  onUploadAvatar,
  onDeleteAvatar,
  onAvatarChange,
}: ProfileFormProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    onLoad()
      .then((data) => {
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhone(data.phone);
        setLocale(data.locale);
        setBio(data.bio);
        setAddress(data.address);
        setProvince(data.province);
        setDistrict(data.district);
        setDateOfBirth(data.date_of_birth ?? '');
        setErrorMessage(null);
      })
      .catch(() => setErrorMessage(t.profile.loadError))
      .finally(() => setBooting(false));
  }, [onLoad, t.profile.loadError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const message = await onSubmit({
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
      setSuccessMessage(message);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setIsSaving(false);
    }
  }

  if (booting) {
    return (
      <Card title={t.profile.title} subtitle="Task 021–022 — User Profile">
        <p>{t.common.loading}</p>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card title={t.profile.title} subtitle="Task 021–022 — User Profile">
        <p className="auth-form__error">{errorMessage ?? t.profile.loadError}</p>
      </Card>
    );
  }

  return (
    <Card title={t.profile.title} subtitle="Task 021–022 — User Profile">
      <form className="auth-form" onSubmit={handleSubmit}>
        <p className="auth-form__hint">{t.profile.subtitle}</p>
        <AvatarUpload
          avatarUrl={profile.avatar_url ?? null}
          onUpload={onUploadAvatar}
          onRemove={onDeleteAvatar}
          onAvatarChange={onAvatarChange}
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
        <Input
          label={t.profile.phone}
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
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
        <Input
          label={t.profile.bio}
          name="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
        <Input
          label={t.profile.address}
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        <Input
          label={t.profile.province}
          name="province"
          value={province}
          onChange={(event) => setProvince(event.target.value)}
        />
        <Input
          label={t.profile.district}
          name="district"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        />
        <Input
          type="date"
          label={t.profile.dateOfBirth}
          name="date_of_birth"
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
        />

        {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}

        <Button type="submit" isLoading={isSaving}>
          {t.profile.saveProfile}
        </Button>
      </form>
    </Card>
  );
}
