// Self-contained avatar uploader.
//
// Flow when the user picks a file:
//   1. Read file into a data URL → open the crop dialog.
//   2. User pans / zooms a 1:1 square via react-easy-crop.
//   3. On Save, we canvas-crop + resize to 512×512 JPEG (small file → fast
//      load on every page) and upload via the existing presign → PUT to
//      GCS → confirm path, then PUT /users/me/avatar with the GCS key.
//   4. Parent gets the fresh signed URL via onUpdated() so the navbar +
//      profile preview repaint instantly without a page reload.
//
// We deliberately resize down to 512px before uploading — the navbar
// renders at ~32px, so anything larger is wasted bytes that the user has
// to download every signed-URL refresh.
import { useCallback, useRef, useState } from 'react';
import {
  Box, Avatar, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Slider, Typography, CircularProgress, Alert,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Cropper from 'react-easy-crop';
import { uploadsApi, usersApi } from '../../lib/endpoints';

const TARGET_PX = 512;
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB raw upload cap (client side)

// Re-draws the source image into a `size`×`size` square canvas, cropping
// to the area react-easy-crop returned. Returns a Blob (JPEG) ready for
// PUT-to-GCS.
const cropToBlob = (imageSrc, area, size = TARGET_PX) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to encode image')), 'image/jpeg', 0.9);
  };
  img.onerror = () => reject(new Error('Failed to load image'));
  img.src = imageSrc;
});

export default function AvatarUploader({ currentUrl, currentName, onUpdated }) {
  const fileInputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onCropComplete = useCallback((_area, areaPx) => {
    setCroppedAreaPixels(areaPx);
  }, []);

  const pickFile = () => fileInputRef.current?.click();

  const onFileChange = (e) => {
    setError('');
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('That doesn’t look like an image file.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('Image is over 8 MB. Pick a smaller one.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setOpen(true);
    };
    reader.onerror = () => setError('Could not read the file.');
    reader.readAsDataURL(file);
  };

  const close = () => {
    if (saving) return;
    setOpen(false);
    setImageSrc(null);
    setCroppedAreaPixels(null);
    setError('');
  };

  const save = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    setError('');
    try {
      const blob = await cropToBlob(imageSrc, croppedAreaPixels, TARGET_PX);

      // 1. Presign — ask the BE for a signed PUT URL targeting GCS.
      const presign = await uploadsApi.presign({
        purpose: 'avatar',
        content_type: 'image/jpeg',
        size_bytes: blob.size,
        filename: 'avatar.jpg',
      });
      const { upload_url, method, headers, r2_key } = presign?.data ?? presign;

      // 2. Direct PUT to GCS — bypasses our server. Must NOT include an
      //    Authorization header or any of doFetch's defaults; that's why
      //    we use bare fetch here.
      const putRes = await fetch(upload_url, {
        method: method || 'PUT',
        headers: headers || { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      // 3. Confirm — records the upload row and verifies the object exists.
      await uploadsApi.confirm({ purpose: 'avatar', r2_key });

      // 4. Point users.avatar_r2_key at the new object and get a signed
      //    download URL back for immediate render.
      const r = await usersApi.updateMyAvatar({ avatar_r2_key: r2_key });
      const updated = r?.data ?? r;

      onUpdated?.({ avatar_r2_key: updated.avatar_r2_key, avatar_url: updated.avatar_url });
      close();
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await usersApi.updateMyAvatar({ avatar_r2_key: null });
      const updated = r?.data ?? r;
      onUpdated?.({ avatar_r2_key: updated.avatar_r2_key, avatar_url: updated.avatar_url });
    } catch (err) {
      setError(err?.message || 'Could not remove avatar');
    } finally {
      setSaving(false);
    }
  };

  const initials = (currentName || '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          src={currentUrl || undefined}
          sx={{ width: 72, height: 72, fontSize: 24, bgcolor: 'var(--primary)' }}
        >
          {!currentUrl ? initials : null}
        </Avatar>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PhotoCameraIcon />}
              onClick={pickFile}
              disabled={saving}
              sx={{
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                '&:hover': { borderColor: 'var(--primary-dark)', background: 'var(--primary-light)' },
              }}
            >
              {currentUrl ? 'Change' : 'Upload'} photo
            </Button>
            {currentUrl && (
              <Button
                variant="text"
                size="small"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={clear}
                disabled={saving}
              >
                Remove
              </Button>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            JPG, PNG or WEBP up to 8 MB. We crop to a square and resize to 512px.
          </Typography>
        </Box>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
      </Box>

      {error && !open && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>Crop your photo</DialogTitle>
        <DialogContent>
          {imageSrc && (
            <Box sx={{ position: 'relative', width: '100%', height: 320, background: '#0f172a', borderRadius: 1, overflow: 'hidden' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Zoom</Typography>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={(_, v) => setZoom(v)}
              sx={{ color: 'var(--primary)' }}
            />
          </Box>
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={saving}>Cancel</Button>
          <Button
            onClick={save}
            variant="contained"
            disabled={saving || !croppedAreaPixels}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null}
            sx={{
              background: 'var(--primary)',
              color: '#fff',
              '&:hover': { background: 'var(--primary-dark)' },
              '&.Mui-disabled': { background: 'var(--primary)', opacity: 0.5, color: '#fff' },
            }}
          >
            {saving ? 'Saving…' : 'Save photo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
