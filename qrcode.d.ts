declare module 'qrcode' {
  export interface QRCodeToCanvasOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    width?: number;
  }

  const QRCode: {
    toCanvas(
      canvas: HTMLCanvasElement,
      text: string,
      options?: QRCodeToCanvasOptions
    ): Promise<void>;
  };

  export default QRCode;
}
