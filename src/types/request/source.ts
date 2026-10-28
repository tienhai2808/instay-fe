export interface GetSourcesRequest {
  view?: string;
  search?: string;
}

export interface CreateSourceRequest {
  name: string;
}

export interface UpdateSourceRequest {
  name: string;
}
