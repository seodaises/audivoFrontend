import axios from 'axios';
import { API_BASE_URL } from './client';
const BASE_URL = `${API_BASE_URL}/api`;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file) {
  if (!file) throw new Error('No file selected.');
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large — please choose a file under 5 MB.');
  }
}

function uploadImage(path, fieldName, file) {
  validateImageFile(file);

  const form = new FormData();
  form.append(fieldName, file);

  return axios
    .post(`${BASE_URL}${path}`, form, {
      withCredentials: true, // send the auth cookie
    })
    .then((res) => res.data.data.url); 
}

// POST /api/albums/cover-image — used from ArtistStudioPage's album step.
export function uploadAlbumCoverImage(file) {
  return uploadImage('/albums/cover-image', 'cover', file);
}

// POST /api/artist/profile/avatar — used from MyArtistProfilePage.
export function uploadArtistAvatarImage(file) {
  return uploadImage('/artist/profile/avatar', 'avatar', file);
}

// POST /api/auth/me/avatar — used from ProfileDialog (personal account avatar).
export function uploadUserAvatarImage(file) {
  return uploadImage('/auth/me/avatar', 'avatar', file);
}