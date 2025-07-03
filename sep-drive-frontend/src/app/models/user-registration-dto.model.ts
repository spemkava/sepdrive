export enum Role {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER'
}

export interface UserRegistrationDto {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  role: Role;
  password: string;
}
