import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export interface SavedFile {
  filePath: string;
  fileUrl: string;
  fileSize: number;
}

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

export async function saveBase64File(params: {
  leadId: string;
  parentId: string;
  fileName: string;
  base64: string;
}): Promise<SavedFile> {
  const buffer = Buffer.from(params.base64, 'base64');

  const safeName = params.fileName.replaceAll('/', '_');
  const dir = path.join(UPLOADS_DIR, params.leadId, params.parentId);
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${Date.now()}_${safeName}`);
  await writeFile(filePath, buffer);

  const fileUrl = `/uploads/${encodeURIComponent(params.leadId)}/${encodeURIComponent(params.parentId)}/${encodeURIComponent(path.basename(filePath))}`;

  return {
    filePath,
    fileUrl,
    fileSize: buffer.length,
  };
}
