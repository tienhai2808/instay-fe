import { Card, Popconfirm } from "antd";
import { Department, Permission } from "@/types/data/department";
import { BiTrashAlt } from "react-icons/bi";

interface DepartmentCardProps {
  department: Department;
  staffLabel: string;
  permissionsLabel: string;
  viewLabel: string;
  deleteLabel: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteConfirmText: string;
  cancelText: string;
  getPermissionLabel: (permission: Permission) => string;
  onView: (department: Department) => void;
  onDelete: (departmentId: string) => void;
  canDelete?: boolean;
}

export default function DepartmentCard({
  department,
  staffLabel,
  permissionsLabel,
  viewLabel,
  deleteLabel,
  deleteTitle,
  deleteDescription,
  deleteConfirmText,
  cancelText,
  getPermissionLabel,
  onView,
  onDelete,
  canDelete = true,
}: DepartmentCardProps) {
  return (
    <Card className="rounded-3xl! shadow-sm h-fit">
      <div className="flex justify-between items-start">
        <h3
          title={department.name}
          className="min-w-0 flex-1 truncate pr-2 font-semibold text-lg sm:text-xl"
        >
          {department.name}
        </h3>
        <div className="">
          <div className="text-[#8b5cf6] font-semibold text-lg sm:text-xl text-end">
            {department.users_count ?? 0}
          </div>
          <div className="text-gray-600">{staffLabel}</div>
        </div>
      </div>

      <div className="mt-1">
        <p className="text-sm text-gray-500 mb-2">{permissionsLabel}</p>
        <div className="flex items-center gap-2 overflow-hidden">
          {department.permissions?.slice(0, 2).map((permission) => (
            <span
              key={permission.id}
              className="shrink-0 whitespace-nowrap text-xs bg-gray-100 px-2 py-1 text-gray-600 rounded-full"
            >
              {getPermissionLabel(permission)}
            </span>
          ))}
          {(department.permissions?.length ?? 0) > 2 && (
            <span className="shrink-0 whitespace-nowrap text-xs bg-gray-100 px-2 py-1 text-gray-600 rounded-full">
              ...
            </span>
          )}
          {(department.permissions?.length ?? 0) === 0 && (
            <span className="text-xs text-gray-400">--</span>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-4">
        <button
          type="button"
          className="h-10 w-full px-3 rounded-md font-bold cursor-pointer bg-[#8b5cf6] text-white sm:flex-1"
          onClick={() => onView(department)}
        >
          <span className="inline-flex items-center gap-2">{viewLabel}</span>
        </button>

        {canDelete && (
          <Popconfirm
            title={deleteTitle}
            description={deleteDescription}
            onConfirm={() => {
              onDelete(department.id);
            }}
            okText={deleteConfirmText}
            cancelText={cancelText}
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="text-red-500 cursor-pointer flex h-10 w-full px-3 items-center justify-center gap-2 bg-white shadow-sm border border-gray-200 rounded-md sm:w-auto"
            >
              <BiTrashAlt className="text-base" />
              {deleteLabel}
            </button>
          </Popconfirm>
        )}
      </div>
    </Card>
  );
}
