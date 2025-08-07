import { ExtractedDocument, ProcessingStatus } from '../types';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { TextPreprocessor } from './textPreprocessing';
import { TokenizationService } from './tokenization';

// Set up PDF.js worker
GlobalWorkerOptions.workerSrc = PdfWorker;

export class DocumentExtractor {
  private static instance: DocumentExtractor;

  static getInstance(): DocumentExtractor {
    if (!DocumentExtractor.instance) {
      DocumentExtractor.instance = new DocumentExtractor();
    }
    return DocumentExtractor.instance;
  }

  async extractFromPDF(file: File, onProgress?: (status: ProcessingStatus) => void): Promise<string> {
    try {
      onProgress?.({
        id: file.name,
        status: 'extracting',
        progress: 10,
        message: 'Loading PDF document...'
      });

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const totalPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        onProgress?.({
          id: file.name,
          status: 'extracting',
          progress: Math.round((pageNum / totalPages) * 80) + 10,
          message: `Extracting text from page ${pageNum} of ${totalPages}...`
        });

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF. Please ensure the file is not corrupted.');
    }
  }

  async extractFromDocx(file: File, onProgress?: (status: ProcessingStatus) => void): Promise<string> {
    try {
      onProgress?.({
        id: file.name,
        status: 'extracting',
        progress: 20,
        message: 'Reading Word document...'
      });

      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      
      onProgress?.({
        id: file.name,
        status: 'extracting',
        progress: 60,
        message: 'Extracting text content...'
      });

      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages.length > 0) {
        console.warn('Word extraction warnings:', result.messages);
      }

      return result.value;
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error('Failed to extract text from Word document. Please ensure the file is not corrupted.');
    }
  }

  async extractFromText(file: File, onProgress?: (status: ProcessingStatus) => void): Promise<string> {
    try {
      onProgress?.({
        id: file.name,
        status: 'extracting',
        progress: 50,
        message: 'Reading text file...'
      });

      const text = await file.text();
      return text;
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error('Failed to read text file.');
    }
  }

  async extractText(file: File, onProgress?: (status: ProcessingStatus) => void): Promise<ExtractedDocument> {
    const startTime = Date.now();
    
    try {
      onProgress?.({
        id: file.name,
        status: 'extracting',
        progress: 5,
        message: 'Starting text extraction...'
      });

      let extractedText: string;

      switch (file.type) {
        case 'application/pdf':
          extractedText = await this.extractFromPDF(file, onProgress);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          extractedText = await this.extractFromDocx(file, onProgress);
          break;
        case 'application/msword':
          throw new Error('Legacy .doc files are not supported. Please convert to .docx format.');
        case 'text/plain':
          extractedText = await this.extractFromText(file, onProgress);
          break;
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }

      onProgress?.({
        id: file.name,
        status: 'extracting',
        progress: 95,
        message: 'Finalizing extraction...'
      });

      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
      const processingTime = Date.now() - startTime;

      // Preprocess text for LLM consumption
      const preprocessor = TextPreprocessor.getInstance();
      const preprocessedText = preprocessor.preprocessText(extractedText);
      const preprocessingStats = preprocessor.getPreprocessingStats(extractedText, preprocessedText);

      // Tokenize the preprocessed text
      onProgress?.({
        id: file.name,
        status: 'extracting',
        progress: 96,
        message: 'Tokenizing text...'
      });

      let tokenizedData;
      try {
        const tokenizer = TokenizationService.getInstance();
        tokenizedData = await tokenizer.tokenizeText(
          preprocessedText,
          (progress, message) => {
            onProgress?.({
              id: file.name,
              status: 'extracting',
              progress: 96 + (progress * 0.03), // Use remaining 3% for tokenization
              message: `Tokenization: ${message}`
            });
          }
        );
      } catch (tokenError) {
        console.warn('Tokenization failed (Azure Function may not be configured or accessible), continuing without tokenized data:', tokenError);
        // Don't fail the entire extraction if tokenization fails
        onProgress?.({
          id: file.name,
          status: 'extracting',
          progress: 99,
          message: 'Tokenization unavailable, finalizing extraction...'
        });
      }

      const result: ExtractedDocument = {
        id: `${file.name}-${startTime}`,
        fileName: file.name,
        fileType: file.type,
        extractedText,
        preprocessedText,
        tokenizedData,
        wordCount,
        extractedAt: new Date(),
        metadata: {
          preprocessingStats
        }
      };

      onProgress?.({
        id: file.name,
        status: 'completed',
        progress: 100,
        message: `Extraction completed in ${Math.round(processingTime / 1000)}s. ${wordCount} words extracted.`
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
      
      onProgress?.({
        id: file.name,
        status: 'error',
        progress: 0,
        message: 'Extraction failed',
        error: errorMessage
      });

      throw error;
    }
  }
}