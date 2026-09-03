import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from './models';

/** Extrae un mensaje legible y los errores de campo de una respuesta de error HTTP. */
export function describeError(err: unknown): { message: string; fields: Record<string, string> } {
  if (err instanceof HttpErrorResponse) {
    const body = (err.error ?? {}) as ProblemDetail;
    if (err.status === 0) {
      return { message: 'No se pudo conectar con el servidor', fields: {} };
    }
    return {
      message: body.detail ?? defaultMessage(err.status),
      fields: body.errors ?? {},
    };
  }
  return { message: 'Se ha producido un error inesperado', fields: {} };
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Datos no válidos';
    case 401:
      return 'Sesión no válida. Inicia sesión de nuevo';
    case 403:
      return 'No tienes permiso para esta acción';
    case 404:
      return 'No encontrado';
    case 409:
      return 'La operación entra en conflicto con el estado actual';
    case 413:
      return 'El fichero es demasiado grande';
    default:
      return 'Error del servidor';
  }
}
