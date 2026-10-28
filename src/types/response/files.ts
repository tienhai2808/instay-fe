export interface UploadPresignedURLResponse {
  url: string;
  key: string;
}

export interface UploadPresignedURLsResponseData {
  presigned_urls: UploadPresignedURLResponse[];
}
