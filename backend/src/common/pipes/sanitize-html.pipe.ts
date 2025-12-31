import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class SanitizeHtmlPipe implements PipeTransform {
  private readonly htmlRegex = /<[^>]*>/g;
  private readonly scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

  transform(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitize(value);
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value as Record<string, unknown>);
    }

    return value;
  }

  private sanitize(input: string): string {
    // Remove script tags and their content
    let sanitized = input.replace(this.scriptRegex, '');
    // Remove other HTML tags
    sanitized = sanitized.replace(this.htmlRegex, '');
    // Escape special characters
    sanitized = this.escapeHtml(sanitized);
    return sanitized.trim();
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitize(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string' ? this.sanitize(item) : item,
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private escapeHtml(str: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
  }
}
