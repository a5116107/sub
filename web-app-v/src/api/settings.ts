import { api } from './client';

export interface PublicSettings {
  site_name: string;
  site_description?: string;
  registration_enabled: boolean;
  email_verification_required?: boolean;
  oauth_providers?: string[];
  default_user_concurrency?: number;
}

export const settingsApi = {
  getPublic: () =>
    api.get<PublicSettings>('/settings/public'),
};
