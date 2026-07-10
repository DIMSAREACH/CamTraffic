import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button, useTranslation } from '@camtraffic/ui';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

interface AvatarUploadProps {
  avatarUrl: string | null;
  onUpload: (file: File) => Promise<{ avatar_url: string | null; message: string }>;
  onRemove: () => Promise<{ avatar_url: string | null; message: string }>;
  onAvatarChange?: (avatarUrl: string | null) => void;
}

export function AvatarUpload({
  avatarUrl,
  onUpload,
  onRemove,
  onAvatarChange,
}: AvatarUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(avatarUrl);
  }, [avatarUrl]);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t.profile.avatarInvalidType;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return t.profile.avatarTooLarge;
    }
    return null;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onUpload(file);
      setPreviewUrl(result.avatar_url);
      onAvatarChange?.(result.avatar_url);
      setSuccessMessage(result.message);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await onRemove();
      setPreviewUrl(result.avatar_url);
      onAvatarChange?.(result.avatar_url);
      setSuccessMessage(result.message);
    } catch {
      setErrorMessage(t.errors.generic);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="profile-avatar">
      <div className="profile-avatar__preview">
        {previewUrl ? (
          <img src={previewUrl} alt={t.profile.avatar} className="profile-avatar__image" />
        ) : (
          <div className="profile-avatar__placeholder" aria-hidden="true">
            <span>{t.profile.avatarInitials}</span>
          </div>
        )}
      </div>
      <div className="profile-avatar__actions">
        <p className="auth-form__label">{t.profile.avatar}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleFileChange}
        />
        <div className="profile-avatar__buttons">
          <Button
            type="button"
            variant="secondary"
            isLoading={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {t.profile.uploadAvatar}
          </Button>
          {previewUrl ? (
            <Button type="button" variant="ghost" isLoading={isRemoving} onClick={handleRemove}>
              {t.profile.removeAvatar}
            </Button>
          ) : null}
        </div>
        {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-form__success">{successMessage}</p> : null}
      </div>
    </div>
  );
}
