import type { BasicBranch, Branch } from "@/types/data/branch";
import type { PaginationMeta } from "./meta";

export interface BranchesResponseData {
  branches: Branch[];
  meta?: PaginationMeta;
}

export interface BasicBranchesResponseData {
  branches: BasicBranch[];
}
