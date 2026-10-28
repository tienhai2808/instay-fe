export interface UploadPresignedURLRequest {
  file_name: string;
  content_type: string;
}

export interface UploadPresignedURLsRequest {
  files: UploadPresignedURLRequest[];
}
