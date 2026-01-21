import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { FileTypeEnum } from './file.type'

/**
 * File query schema
 */
export const FileQuerySchema = z.object({
  type: z.enum(FileTypeEnum),
  name: z.string(),
})

export class FileQueryDto extends createZodDto(FileQuerySchema) {}

/**
 * File upload schema
 */
export const FileUploadSchema = z.object({
  type: z.enum(FileTypeEnum).optional(),
})

export class FileUploadDto extends createZodDto(FileUploadSchema) {}

/**
 * File delete query schema
 */
export const FileDeleteQuerySchema = z.object({
  storage: z.enum(['local', 's3']).optional(),
  url: z.string().optional(),
})

export class FileDeleteQueryDto extends createZodDto(FileDeleteQuerySchema) {}

/**
 * Rename file query schema
 */
export const RenameFileQuerySchema = z.object({
  new_name: z.string(),
})

export class RenameFileQueryDto extends createZodDto(RenameFileQuerySchema) {}

// Type exports
export type FileQueryInput = z.infer<typeof FileQuerySchema>
export type FileUploadInput = z.infer<typeof FileUploadSchema>
export type FileDeleteQueryInput = z.infer<typeof FileDeleteQuerySchema>
export type RenameFileQueryInput = z.infer<typeof RenameFileQuerySchema>
