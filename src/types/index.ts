export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  file: File;
}

export interface ExtractedDocument {
  id: string;
  fileName: string;
  fileType: string;
  extractedText: string;
  preprocessedText?: string;
  tokenizedData?: TokenizedData;
  wordCount: number;
  extractedAt: Date;
  metadata?: {
    pageCount?: number;
    author?: string;
    title?: string;
    subject?: string;
    keywords?: string;
    preprocessingStats?: {
      originalWordCount: number;
      processedWordCount: number;
      originalLineCount: number;
      processedLineCount: number;
      compressionRatio: number;
      structureImprovement: number;
    };
  };
}

export interface TokenizedData {
  tokens: string[];
  tokenIds: number[];
  tokenCount: number;
  modelName: string;
  tokenizedAt: Date;
}

export interface TokenizationConfigType {
  modelName: string;
  azureFunctionUrl: string;
  apiKey?: string;
}

export interface ProcessingStatus {
  id: string;
  status: 'uploading' | 'extracting' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}