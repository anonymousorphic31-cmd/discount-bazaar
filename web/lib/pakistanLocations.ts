export interface CityDelivery {
  fee: number;
  areas: string[];
}

export const PAKISTAN_LOCATIONS: Record<string, Record<string, CityDelivery>> = {
  Sindh: {
    Sukkur: {
      fee: 150,
      areas: ["Abad Lakha", "Abdullah Shar", "Barrage Colony", "Bachal Shah Miani"],
    },
    Karachi: {
      fee: 200,
      areas: ["Clifton", "DHA Phase 6", "Gulshan-e-Iqbal"],
    },
  },
  Punjab: {
    Lahore: {
      fee: 250,
      areas: ["DHA", "Gulberg", "Johar Town"],
    },
    Faisalabad: {
      fee: 250,
      areas: ["Madina Town", "Millat Colony"],
    },
  },
};

export function getProvinces(): string[] {
  return Object.keys(PAKISTAN_LOCATIONS);
}

export function getCities(province: string): string[] {
  return Object.keys(PAKISTAN_LOCATIONS[province] ?? {});
}

export function getAreas(province: string, city: string): string[] {
  return PAKISTAN_LOCATIONS[province]?.[city]?.areas ?? [];
}

export function getDeliveryFee(province: string, city: string): number {
  return PAKISTAN_LOCATIONS[province]?.[city]?.fee ?? 0;
}
