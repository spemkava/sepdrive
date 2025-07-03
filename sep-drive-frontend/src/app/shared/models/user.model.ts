export enum UserRole {
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER'
}

export enum CarClass {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  DELUXE = 'DELUXE'
}

export interface User {
  id?: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  role: UserRole;
  profilePicturePath?: string;
  rating?: number;
  totalRides?: number;
  carClass?: CarClass;
}
