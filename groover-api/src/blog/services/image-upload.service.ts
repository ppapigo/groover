// src/blog/services/image-upload.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadedImage {
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  size: number;
  mimeType: string;
}

export interface ImageUploadOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  generateThumbnail?: boolean;
}

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly useS3: boolean;
  private readonly s3Client: S3Client;
  private readonly s3Bucket: string;
  private readonly s3Region: string;

  private readonly defaultOptions: ImageUploadOptions = {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    generateThumbnail: true,
  };

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR') || './uploads/blog';
    this.baseUrl = this.configService.get('CDN_BASE_URL') || '/uploads/blog';
    this.s3Bucket = this.configService.get('AWS_S3_BUCKET') || '';
    this.s3Region = this.configService.get('AWS_REGION') || 'ap-southeast-2';
    this.useS3 = !!this.s3Bucket;

    if (this.useS3) {
      this.s3Client = new S3Client({
        region: this.s3Region,
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || '',
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || '',
        },
      });
      this.logger.log(`S3 업로드 활성화: ${this.s3Bucket}`);
    } else {
      this.ensureDirectoryExists(this.uploadDir);
      this.ensureDirectoryExists(path.join(this.uploadDir, 'thumbnails'));
    }
  }

  async uploadImage(
    file: MulterFile,
    userId: string,
    options?: ImageUploadOptions,
  ): Promise<UploadedImage> {
    const opts = { ...this.defaultOptions, ...options };
    this.validateFile(file, opts);

    const filename = this.generateFilename(file.originalname, userId);
    const thumbnailFilename = `thumb_${filename}`;

    if (this.useS3) {
      return this.uploadToS3(file, filename, thumbnailFilename, opts);
    }

    return this.uploadToLocal(file, filename, thumbnailFilename, opts);
  }

  private async uploadToLocal(
    file: MulterFile,
    filename: string,
    thumbnailFilename: string,
    options: ImageUploadOptions,
  ): Promise<UploadedImage> {
    const filePath = path.join(this.uploadDir, filename);
    const thumbnailPath = path.join(this.uploadDir, 'thumbnails', thumbnailFilename);

    await fs.promises.writeFile(filePath, file.buffer);

    if (options.generateThumbnail) {
      await fs.promises.writeFile(thumbnailPath, file.buffer);
    }

    return {
      url: `${this.baseUrl}/${filename}`,
      thumbnailUrl: `${this.baseUrl}/thumbnails/${thumbnailFilename}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private async uploadToS3(
    file: MulterFile,
    filename: string,
    thumbnailFilename: string,
    options: ImageUploadOptions,
  ): Promise<UploadedImage> {
    const key = `images/${filename}`;
    const thumbnailKey = `images/thumbnails/${thumbnailFilename}`;

    // 원본 업로드
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    // 썸네일 업로드 (현재는 원본 복사)
    if (options.generateThumbnail) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: thumbnailKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    }

    const baseS3Url = `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com`;

    return {
      url: `${baseS3Url}/${key}`,
      thumbnailUrl: `${baseS3Url}/${thumbnailKey}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      if (this.useS3 && imageUrl.includes(this.s3Bucket)) {
        const key = imageUrl.split('.amazonaws.com/')[1];
        if (key) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.s3Bucket,
              Key: key,
            }),
          );
        }
        return;
      }

      const filename = imageUrl.replace(`${this.baseUrl}/`, '');
      const filePath = path.join(this.uploadDir, filename);
      const thumbnailPath = path.join(this.uploadDir, 'thumbnails', `thumb_${filename}`);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      if (fs.existsSync(thumbnailPath)) {
        await fs.promises.unlink(thumbnailPath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete image: ${imageUrl}`, error);
    }
  }

  private validateFile(file: MulterFile, options: ImageUploadOptions): void {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    if (file.size > options.maxSizeBytes!) {
      const maxSizeMB = options.maxSizeBytes! / (1024 * 1024);
      throw new BadRequestException(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
    }

    if (!options.allowedMimeTypes!.includes(file.mimetype)) {
      throw new BadRequestException(
        `허용되지 않는 파일 형식입니다. (허용: ${options.allowedMimeTypes!.join(', ')})`,
      );
    }
  }

  private generateFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName).toLowerCase();
    const userPrefix = userId.slice(0, 8);
    
    return `${userPrefix}_${timestamp}_${random}${ext}`;
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}