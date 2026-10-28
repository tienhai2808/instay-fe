import { getUploadPresignedURLs } from "@/apis/files";
import { UploadPresignedURLResponse } from "@/types/response/files";

export type PresignedUploadItem = {
  file: File;
  fileName?: string;
  contentType?: string;
};

export type PresignedUploadResult = UploadPresignedURLResponse & {
  file: File;
};

const resolvePresignedList = (payload: unknown) => {
  if (Array.isArray(payload)) return payload as UploadPresignedURLResponse[];
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    if (Array.isArray(data.presigned_urls))
      return data.presigned_urls as UploadPresignedURLResponse[];
  }
  return [] as UploadPresignedURLResponse[];
};

const uploadToPresignedURL = async (
  url: string,
  file: File,
  contentType: string,
) => {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!res.ok) {
    throw res;
  }
};

export const uploadFilesWithPresignedURLs = async (
  items: PresignedUploadItem[],
) => {
  if (!items.length) return [] as PresignedUploadResult[];

  const filesPayload = items.map((item) => ({
    file_name: item.fileName || item.file.name,
    content_type:
      item.contentType || item.file.type || "application/octet-stream",
  }));

  const res = await getUploadPresignedURLs({ files: filesPayload });
  const payload = res?.data?.data ?? res?.data;
  const presignedList = resolvePresignedList(payload);

  if (presignedList.length !== items.length) {
    throw res;
  }

  await Promise.all(
    presignedList.map((presigned, index) =>
      uploadToPresignedURL(
        presigned.url,
        items[index].file,
        filesPayload[index].content_type,
      ),
    ),
  );

  return presignedList.map((presigned, index) => ({
    ...presigned,
    file: items[index].file,
  }));
};
