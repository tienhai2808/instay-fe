import {
  ServiceType,
  ServiceTypeService,
  ServiceTypeWithServices,
} from "@/types/data/service_type";
import { PaginationMeta } from "./meta";

export interface ServiceTypesResponseData {
  service_types?: ServiceType[];
  pagination?: PaginationMeta;
}

export interface ServiceTypeResponseData {
  service_type?: ServiceType;
}

export interface ServiceTypesWithServicesResponseData {
  service_types?: ServiceTypeWithServices[];
}

export interface GuestServiceTypeWithServicesResponseData {
  service_type?: ServiceTypeWithServices;
  services?: ServiceTypeService[];
}
