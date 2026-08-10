export interface TenantFormData {
  firstname: string;
  lastname: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  phone: string;
  location: string;
  budgetMin: string;
  budgetMax: string;
  preferredLocation: string;
  preferredDistricts: string[];
  leaseDuration: string;
  cleanliness: string;
  socialLevel: string;
  guestsFrequency: string;
  noSmokers: boolean;
  noPets: boolean;
  noParties: boolean;
  sameGenderOnly: boolean;
  quietHoursRequired: boolean;
  noChildren: boolean;
  noCouples: boolean;
  hasPartner: boolean;
  hasChildren: boolean;
  childrenCount: string;
  languages: string[];
  preferredLanguage: string;
}

export type UpdateTenantField = <K extends keyof TenantFormData>(
  field: K,
  value: TenantFormData[K]
) => void;

export interface ChoiceOption {
  value: string;
  labelKey: string;
}
