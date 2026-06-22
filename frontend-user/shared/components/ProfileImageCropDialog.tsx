import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@shared/components/ui/dialog';
import { Slider } from '@shared/components/ui/slider';
import { useLanguage } from '@shared/context/LanguageContext';
import {
  CROP_VIEW_SIZE,
  clampCropOffset,
  cropProfileImageFile,
  getInitialCropOffset,
  getDisplaySize,
  type CropTransform,
} from '@shared/utils/profileImageCrop';

interface ProfileImageCropDialogProps {
  open: boolean;
  file: File | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => Promise<void>;
}

export function ProfileImageCropDialog({ open, file, onOpenChange, onConfirm }: ProfileImageCropDialogProps) {
  const { t } = useLanguage();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ offsetX: 0, offsetY: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });

  useEffect(() => {
    if (!open || !file) {
      setImageUrl(null);
      setImgSize(null);
      setZoom(1);
      setOffset({ offsetX: 0, offsetY: 0 });
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setOffset(getInitialCropOffset(img.naturalWidth, img.naturalHeight, 1));
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const applyZoom = useCallback((nextZoom: number) => {
    if (!imgSize) return;
    setZoom(nextZoom);
    setOffset((prev) => clampCropOffset(prev.offsetX, prev.offsetY, imgSize.w, imgSize.h, nextZoom));
  }, [imgSize]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgSize) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.offsetX,
      startOffsetY: offset.offsetY,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || !imgSize) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = clampCropOffset(
      dragRef.current.startOffsetX + dx,
      dragRef.current.startOffsetY + dy,
      imgSize.w,
      imgSize.h,
      zoom,
    );
    setOffset(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleClose = () => {
    if (saving) return;
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!file || !imgSize) return;
    setSaving(true);
    try {
      const transform: CropTransform = { zoom, ...offset };
      const cropped = await cropProfileImageFile(file, transform);
      await onConfirm(cropped);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const display = imgSize ? getDisplaySize(imgSize.w, imgSize.h, zoom) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="profile-crop-dialog max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('profile.cropPhotoTitle')}</DialogTitle>
          <DialogDescription>{t('profile.cropPhotoDesc')}</DialogDescription>
        </DialogHeader>

        <div
          className="profile-crop-dialog__viewport"
          style={{ width: CROP_VIEW_SIZE, height: CROP_VIEW_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imageUrl && display && (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="profile-crop-dialog__image"
              style={{
                width: display.width,
                height: display.height,
                transform: `translate(${offset.offsetX}px, ${offset.offsetY}px)`,
              }}
            />
          )}
          <div className="profile-crop-dialog__mask" aria-hidden />
        </div>

        <div className="profile-crop-dialog__zoom">
          <ZoomIn size={15} className="profile-crop-dialog__zoom-icon" />
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={([v]) => applyZoom(v)}
            aria-label={t('profile.cropZoom')}
          />
        </div>
        <p className="profile-crop-dialog__hint">{t('profile.cropPhotoHint')}</p>

        <DialogFooter className="profile-crop-dialog__footer">
          <button type="button" className="profile-crop-dialog__btn profile-crop-dialog__btn--ghost" disabled={saving} onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="profile-crop-dialog__btn profile-crop-dialog__btn--primary"
            disabled={saving || !file || !imgSize}
            onClick={() => void handleConfirm()}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {t('profile.cropPhotoApply')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
