// src/blog/services/image-upload.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Multer File 인터페이스 직접 정의
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

/**
 * 이미지 업로드 서비스
 * - 로컬 저장소 또는 S3 지원
 * - 썸네일 자동 생성
 * - CDN URL 반환
 */
@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly useS3: boolean;

  private readonly defaultOptions: ImageUploadOptions = {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    generateThumbnail: true,
  };

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR') || './uploads/blog';
    this.baseUrl = this.configService.get('CDN_BASE_URL') || '/uploads/blog';
    this.useS3 = this.configService.get('USE_S3') === 'true';

    // 로컬 디렉토리 생성
    if (!this.useS3) {
      this.ensureDirectoryExists(this.uploadDir);
      this.ensureDirectoryExists(path.join(this.uploadDir, 'thumbnails'));
    }
  }

  /**
   * 이미지 업로드
   */
  async uploadImage(
    file: MulterFile,
    userId: string,
    options?: ImageUploadOptions,
  ): Promise<UploadedImage> {
    const opts = { ...this.defaultOptions, ...options };

    // 유효성 검사
    this.validateFile(file, opts);

    // 파일명 생성 (충돌 방지)
    const filename = this.generateFilename(file.originalname, userId);
    const thumbnailFilename = `thumb_${filename}`;

    if (this.useS3) {
      return this.uploadToS3(file, filename, thumbnailFilename, opts);
    }

    return this.uploadToLocal(file, filename, thumbnailFilename, opts);
  }

  /**
   * 로컬 저장소 업로드
   */
  private async uploadToLocal(
    file: MulterFile,
    filename: string,
    thumbnailFilename: string,
    options: ImageUploadOptions,
  ): Promise<UploadedImage> {
    const filePath = path.join(this.uploadDir, filename);
    const thumbnailPath = path.join(this.uploadDir, 'thumbnails', thumbnailFilename);

    // 원본 저장
    await fs.promises.writeFile(filePath, file.buffer);

    // 썸네일 생성 (sharp 없이 원본 복사 - 실제로는 sharp 사용 권장)
    if (options.generateThumbnail) {
      // TODO: sharp로 리사이즈 구현
      // 현재는 원본 복사
      await fs.promises.writeFile(thumbnailPath, file.buffer);
    }

    return {
      url: `${this.baseUrl}/${filename}`,
      thumbnailUrl: `${this.baseUrl}/thumbnails/${thumbnailFilename}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * S3 업로드 (구현 예시)
   */
  private async uploadToS3(
    file: MulterFile,
    filename: string,
    thumbnailFilename: string,
    options: ImageUploadOptions,
  ): Promise<UploadedImage> {
    // TODO: AWS SDK 사용하여 S3 업로드 구현
    // const s3 = new AWS.S3();
    // await s3.upload({ Bucket, Key: filename, Body: file.buffer }).promise();

    throw new BadRequestException('S3 업로드는 아직 구현되지 않았습니다.');
  }

  /**
   * 이미지 삭제
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      if (this.useS3) {
        // TODO: S3 삭제
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

  /**
   * 파일 유효성 검사
   */
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

  /**
   * 고유 파일명 생성
   */
  private generateFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName).toLowerCase();
    const userPrefix = userId.slice(0, 8);
    
    return `${userPrefix}_${timestamp}_${random}${ext}`;
  }

  /**
   * 디렉토리 생성
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
