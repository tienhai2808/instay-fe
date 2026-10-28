export interface GetFloorsRequest {
  view?: string;
  search?: string;
  branch_id?: string;
}

export interface CreateFloorRequest {
  name: string;
  branch_id: string;
}

export interface UpdateFloorRequest {
  name: string;
  branch_id: string;
}
