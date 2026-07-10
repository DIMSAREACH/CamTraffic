import type { ApiClient } from '../client';
import type { UpdateProfilePayload, UserProfile } from '@camtraffic/types';

export function createProfileEndpoints(client: ApiClient) {
  return {
    me: () => client.get<UserProfile>('/api/v1/users/profile/me/'),
    updateMe: (payload: UpdateProfilePayload) =>
      client.patch<UserProfile>('/api/v1/users/profile/me/', payload),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return client.post<UserProfile>('/api/v1/users/profile/me/avatar/', formData);
    },
    deleteAvatar: () => client.delete<UserProfile>('/api/v1/users/profile/me/avatar/'),
  };
}
