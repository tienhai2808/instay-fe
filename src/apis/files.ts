import axiosRequest from "@/config/axios";
import { UploadPresignedURLsRequest } from "@/types/request/files";
import { ApiResponseEnvelope } from "@/types/response/common";
import { UploadPresignedURLsResponseData } from "@/types/response/files";

export const getUploadPresignedURLs = (data: UploadPresignedURLsRequest) => {
  return axiosRequest.post<
    ApiResponseEnvelope<UploadPresignedURLsResponseData>
  >("/files/presigned-urls/uploads", data);
};
