"""Resize profile photos for web — keep sharp, natural color."""
import io
import os

from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image, ImageFilter, ImageOps

MAX_EDGE = 1024
JPEG_QUALITY = 95


def optimize_profile_image(uploaded_file):
    """Downscale only when needed; light sharpen for clear avatars."""
    img = Image.open(uploaded_file)
    img = ImageOps.exif_transpose(img)

    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    if max(img.size) > MAX_EDGE:
        img.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)

    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2))

    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=JPEG_QUALITY, optimize=True, subsampling=0)
    buffer.seek(0)

    base = os.path.splitext(getattr(uploaded_file, 'name', 'profile') or 'profile')[0]
    return InMemoryUploadedFile(
        buffer,
        'ImageField',
        f'{base}.jpg',
        'image/jpeg',
        buffer.getbuffer().nbytes,
        None,
    )
