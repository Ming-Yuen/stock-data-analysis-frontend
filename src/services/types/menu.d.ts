import { ApiResponse } from "../../hooks/api";

//menu
export interface MenuTree {
  menuId: string;
  parentId?: string;
  name: string;
  icon?: string;
  path: string;
  children?: MenuTree[];
}

export interface MenuEnquiryResponse extends ApiResponse {
  menuTrees: MenuTree[];
}
