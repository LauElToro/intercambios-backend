export interface AuthToken {
  userId: number;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  email: string;
  password: string;
  contacto: string;
  ofrece: string;
  necesita: string;
  precioOferta?: number;
  ubicacion?: string;
}
