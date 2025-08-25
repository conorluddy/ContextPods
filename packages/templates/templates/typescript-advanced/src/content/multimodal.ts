/**
 * Multi-modal content support for {{serverName}}
 * Handles text, images, audio, and other content types in MCP
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ImageContent, TextContent, EmbeddedResource } from '@modelcontextprotocol/sdk/types.js';
import { readFile, stat } from 'fs/promises';
import { extname, basename } from 'path';
import { logger } from '../utils/logger.js';

/**
 * Supported content types
 */
export type ContentType =
  | 'text/plain'
  | 'text/markdown'
  | 'text/html'
  | 'text/csv'
  | 'application/json'
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/svg+xml'
  | 'audio/wav'
  | 'audio/mp3'
  | 'audio/ogg'
  | 'video/mp4'
  | 'application/pdf';

/**
 * Content metadata
 */
interface ContentMetadata {
  filename?: string;
  size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // For audio/video in seconds
  encoding?: string;
  created?: Date;
  modified?: Date;
}

/**
 * Multi-modal content wrapper
 */
export interface MultiModalContent {
  type: ContentType;
  content: TextContent | ImageContent | EmbeddedResource;
  metadata?: ContentMetadata;
  description?: string;
}

/**
 * Content processor for different media types
 */
export class MultiModalProcessor {
  private supportedTypes: Set<ContentType>;

  constructor() {
    this.supportedTypes = new Set([
      'text/plain',
      'text/markdown',
      'text/html',
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'audio/wav',
      'audio/mp3',
      'audio/ogg',
      'video/mp4',
      'application/pdf',
    ]);
  }

  /**
   * Detect content type from file extension
   */
  detectContentType(filePath: string): ContentType | null {
    const ext = extname(filePath).toLowerCase();

    const typeMap: Record<string, ContentType> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.markdown': 'text/markdown',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mp3',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
    };

    return typeMap[ext] || null;
  }

  /**
   * Check if content type is supported
   */
  isSupported(contentType: ContentType): boolean {
    return this.supportedTypes.has(contentType);
  }

  /**
   * Process file into multi-modal content
   */
  async processFile(filePath: string): Promise<MultiModalContent> {
    const contentType = this.detectContentType(filePath);

    if (!contentType) {
      throw new Error(`Unsupported file type: ${filePath}`);
    }

    if (!this.isSupported(contentType)) {
      throw new Error(`Content type not supported: ${contentType}`);
    }

    const stats = await stat(filePath);
    const metadata: ContentMetadata = {
      filename: basename(filePath),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };

    // Handle text content
    if (contentType.startsWith('text/') || contentType === 'application/json') {
      const textContent = await readFile(filePath, 'utf-8');
      return {
        type: contentType,
        content: {
          type: 'text',
          text: textContent,
        },
        metadata,
      };
    }

    // Handle image content
    if (contentType.startsWith('image/')) {
      if (contentType === 'image/svg+xml') {
        // SVG as text
        const svgContent = await readFile(filePath, 'utf-8');
        return {
          type: contentType,
          content: {
            type: 'text',
            text: svgContent,
          },
          metadata,
        };
      } else {
        // Binary image as base64
        const imageBuffer = await readFile(filePath);
        const base64Data = imageBuffer.toString('base64');

        return {
          type: contentType,
          content: {
            type: 'image',
            data: base64Data,
            mimeType: contentType,
          },
          metadata,
        };
      }
    }

    // Handle other binary content as embedded resource
    const binaryData = await readFile(filePath);
    const base64Data = binaryData.toString('base64');

    return {
      type: contentType,
      content: {
        type: 'resource',
        resource: {
          uri: `file://${filePath}`,
          text: base64Data,
          mimeType: contentType,
        },
      },
      metadata,
    };
  }

  /**
   * Create text content with formatting
   */
  createTextContent(
    text: string,
    format: 'plain' | 'markdown' | 'html' = 'plain',
  ): MultiModalContent {
    const contentTypeMap = {
      plain: 'text/plain' as const,
      markdown: 'text/markdown' as const,
      html: 'text/html' as const,
    };

    return {
      type: contentTypeMap[format],
      content: {
        type: 'text',
        text,
      },
      metadata: {
        size: Buffer.byteLength(text, 'utf8'),
        created: new Date(),
      },
    };
  }

  /**
   * Create image content from base64 data
   */
  createImageContent(
    base64Data: string,
    mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    metadata?: Partial<ContentMetadata>,
  ): MultiModalContent {
    return {
      type: mimeType,
      content: {
        type: 'image',
        data: base64Data,
        mimeType,
      },
      metadata: {
        size: Math.ceil(base64Data.length * 0.75), // Approximate decoded size
        encoding: 'base64',
        ...metadata,
      },
    };
  }

  /**
   * Extract text from multi-modal content
   */
  extractText(content: MultiModalContent): string {
    if (content.content.type === 'text') {
      return content.content.text;
    }

    if (content.content.type === 'resource' && content.content.resource.text) {
      // Try to decode if it's base64 text content
      if (content.type.startsWith('text/')) {
        try {
          return Buffer.from(content.content.resource.text, 'base64').toString('utf-8');
        } catch {
          return content.content.resource.text;
        }
      }
    }

    return `[${content.type} content: ${content.metadata?.filename || 'unnamed'}]`;
  }

  /**
   * Get content summary
   */
  getSummary(content: MultiModalContent): string {
    const { type, metadata } = content;
    const filename = metadata?.filename || 'unnamed';
    const size = metadata?.size ? ` (${Math.round(metadata.size / 1024)}KB)` : '';

    if (type.startsWith('image/')) {
      const dims = metadata?.dimensions
        ? ` ${metadata.dimensions.width}x${metadata.dimensions.height}`
        : '';
      return `Image: ${filename}${dims}${size}`;
    }

    if (type.startsWith('audio/')) {
      const duration = metadata?.duration ? ` ${Math.round(metadata.duration)}s` : '';
      return `Audio: ${filename}${duration}${size}`;
    }

    if (type.startsWith('video/')) {
      const duration = metadata?.duration ? ` ${Math.round(metadata.duration)}s` : '';
      return `Video: ${filename}${duration}${size}`;
    }

    if (type.startsWith('text/')) {
      const lines = content.content.type === 'text' ? content.content.text.split('\n').length : 0;
      return `Text: ${filename} (${lines} lines)${size}`;
    }

    return `${type}: ${filename}${size}`;
  }
}

// Global processor instance
export const multiModalProcessor = new MultiModalProcessor();

/**
 * Multi-modal tools for content processing
 */
export const multiModalTools = [
  {
    name: 'process-content',
    title: 'Multi-Modal Content Processor',
    description: 'Process various content types (text, images, audio, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the content file',
        },
        contentType: {
          type: 'string',
          description: 'Override content type detection',
        },
        extractText: {
          type: 'boolean',
          description: 'Extract text content if possible',
          default: false,
        },
      },
      required: ['filePath'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Detected/specified content type',
        },
        summary: {
          type: 'string',
          description: 'Content summary',
        },
        metadata: {
          type: 'object',
          description: 'Content metadata',
        },
        textContent: {
          type: 'string',
          description: 'Extracted text (if requested and available)',
        },
        content: {
          type: 'object',
          description: 'Processed content object',
        },
      },
      required: ['type', 'summary'],
    },
  },
  {
    name: 'create-content',
    title: 'Content Creator',
    description: 'Create multi-modal content from various inputs',
    inputSchema: {
      type: 'object',
      properties: {
        contentType: {
          type: 'string',
          enum: [
            'text/plain',
            'text/markdown',
            'text/html',
            'image/jpeg',
            'image/png',
            'application/json',
          ],
          description: 'Type of content to create',
        },
        data: {
          type: 'string',
          description: 'Content data (text or base64)',
        },
        metadata: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            description: { type: 'string' },
          },
          description: 'Additional metadata',
        },
      },
      required: ['contentType', 'data'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'object',
          description: 'Created multi-modal content',
        },
        summary: {
          type: 'string',
          description: 'Content summary',
        },
      },
      required: ['content', 'summary'],
    },
  },
];
