export class Currency {
  private static readonly IX_TO_PESOS = 1; // Temporal: 1 IX = 1 peso argentino
  private static readonly LIMITE_CREDITO_NEGATIVO_PESOS = 15000;

  static convertIXToPesos(ix: number): number {
    return ix * this.IX_TO_PESOS;
  }

  static convertPesosToIX(pesos: number): number {
    return pesos / this.IX_TO_PESOS;
  }

  static getLimiteCreditoNegativo(): number {
    return this.LIMITE_CREDITO_NEGATIVO_PESOS;
  }

  static formatCurrency(amount: number, currency: 'IX' | 'ARS' = 'IX'): string {
    if (currency === 'ARS') {
      return `$${amount.toLocaleString('es-AR')}`;
    }
    return `${amount} IX`;
  }
}
