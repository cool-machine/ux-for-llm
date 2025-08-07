import { TokenizedData, TokenizationConfigType } from '../types';

export class TokenizationService {
  private static instance: TokenizationService;
  private config: TokenizationConfigType;

  private constructor() {
    // Default configuration - can be overridden
    this.config = {
      modelName: 'gpt-oss-120b',
      azureFunctionUrl: import.meta.env.VITE_AZURE_TOKENIZER_URL || 'https://ocp10-tokenizer-function.azurewebsites.net/api/tokenizerfunction',
      apiKey: import.meta.env.VITE_AZURE_TOKENIZER_KEY
    };
    
    // Ensure we always use the correct Azure Function URL
    if (!this.config.azureFunctionUrl || this.config.azureFunctionUrl === 'https://your-function-app.azurewebsites.net/api/tokenize') {
      this.config.azureFunctionUrl = 'https://ocp10-tokenizer-function.azurewebsites.net/api/tokenizerfunction';
    }
  }

  static getInstance(): TokenizationService {
    if (!TokenizationService.instance) {
      TokenizationService.instance = new TokenizationService();
    }
    return TokenizationService.instance;
  }

  /**
   * Update tokenization configuration
   */
  updateConfig(config: Partial<TokenizationConfigType>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TokenizationConfigType {
    return { ...this.config };
  }

  /**
   * Tokenize text using Azure Function
   */
  async tokenizeText(
    text: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<TokenizedData> {
    if (!this.config.azureFunctionUrl || this.config.azureFunctionUrl.trim() === '') {
      throw new Error('Azure Function URL not configured. Please configure the tokenizer in the header "Tokenizer Config" section.');
    }

    onProgress?.(10, 'Connecting to tokenization service...');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      // Add API key if configured
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      onProgress?.(30, 'Sending text for tokenization...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(this.config.azureFunctionUrl, {
        method: 'POST',
        headers,
        mode: 'cors',
        signal: controller.signal,
        body: JSON.stringify({
          text,
          model_name: this.config.modelName,
          return_tokens: true,
          return_token_ids: true
        })
      });

      clearTimeout(timeoutId);

      onProgress?.(70, 'Processing tokenization response...');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tokenization failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const result = await response.json();

      onProgress?.(90, 'Finalizing tokenization...');

      // Validate response structure
      if (!result.tokens || !Array.isArray(result.tokens)) {
        throw new Error('Invalid response format: missing tokens array');
      }

      const tokenizedData: TokenizedData = {
        tokens: result.tokens,
        tokenIds: result.token_ids || [],
        tokenCount: result.tokens.length,
        modelName: result.model || this.config.modelName,
        tokenizedAt: new Date()
      };

      onProgress?.(100, `Tokenization completed. ${tokenizedData.tokenCount} tokens generated.`);

      return tokenizedData;
    } catch (error) {
      console.error('Tokenization error:', error);
      
      if (error instanceof Error) {
        // Provide more helpful error messages for common issues
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. The Azure Function may be slow to respond or unavailable.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Cannot connect to Azure Function. Please check:\n1. Azure Function URL is correct\n2. Function is running and publicly accessible\n3. No CORS restrictions\n4. Your internet connection');
        } else if (error.message.includes('CORS')) {
          throw new Error('CORS error: The Azure Function needs to allow requests from this domain.');
        }
        throw error;
      }
      
      throw new Error('Unknown tokenization error occurred');
    }
  }

  /**
   * Test connection to Azure Function
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.azureFunctionUrl) {
      return false;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.azureFunctionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: 'test',
          model_name: this.config.modelName,
          test_connection: true
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}