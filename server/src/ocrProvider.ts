import { createWorker } from "tesseract.js";

export type OcrResult = {
  text: string;
  provider: string;
};

export interface OcrProvider {
  recognize(image: Buffer): Promise<OcrResult>;
}

class TesseractOcrProvider implements OcrProvider {
  async recognize(image: Buffer): Promise<OcrResult> {
    const worker = await createWorker("spa+eng");
    try {
      const result = await worker.recognize(image);
      return {
        text: result.data.text.trim(),
        provider: "tesseract.js"
      };
    } finally {
      await worker.terminate();
    }
  }
}

class ExternalOcrProvider implements OcrProvider {
  constructor(private readonly apiKey: string) {}

  async recognize(_image: Buffer): Promise<OcrResult> {
    throw new Error(
      `OCR externo no implementado todavia. OCR_API_KEY esta configurada (${this.apiKey.slice(0, 4)}...), pero el proveedor activo sigue pendiente.`
    );
  }
}

export function createOcrProvider(): OcrProvider {
  if (process.env.OCR_PROVIDER === "external" && process.env.OCR_API_KEY) {
    return new ExternalOcrProvider(process.env.OCR_API_KEY);
  }

  return new TesseractOcrProvider();
}
