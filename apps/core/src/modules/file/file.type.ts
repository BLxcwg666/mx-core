export enum FileTypeEnum {
  icon = 'icon',
  file = 'file',
  avatar = 'avatar',
  image = 'image',
  photo = 'photo',
}
export type FileType = keyof typeof FileTypeEnum
