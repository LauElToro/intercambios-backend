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
  ubicacion?: string;
  /** Obligatorio: aceptación de términos generales e IOX (validado en API). */
  aceptaTerminos: boolean;
  /** Código o slug del referente (opcional). */
  codigoReferido?: string;
}
