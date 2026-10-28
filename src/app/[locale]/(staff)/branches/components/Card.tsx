import { Card, Popconfirm } from "antd";
import type { Branch } from "@/types/data/branch";
import { BiTrashAlt } from "react-icons/bi";

interface BranchCardProps {
  branch: Branch;
  locationLabel: string;
  statusLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  viewLabel: string;
  deleteLabel: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteConfirmText: string;
  cancelText: string;
  onView: (branch: Branch) => void;
  onDelete: (branchId: string) => void;
}

export default function BranchCard({
  branch,
  locationLabel,
  statusLabel,
  activeLabel,
  inactiveLabel,
  viewLabel,
  deleteLabel,
  deleteTitle,
  deleteDescription,
  deleteConfirmText,
  cancelText,
  onView,
  onDelete,
}: BranchCardProps) {
  const isActive = Boolean(branch.is_active);
  const location = [branch.ward, branch.city].filter(Boolean).join(", ");

  return (
    <Card className="h-fit rounded-3xl! shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3
            title={branch.name}
            className="truncate pr-2 text-lg font-semibold sm:text-xl"
          >
            {branch.name}
          </h3>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm text-gray-600">
            {branch.address || "--"}
          </p>
        </div>

        <div className="text-right">
          <div className="mb-1 text-xs text-gray-500">{statusLabel}</div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              isActive
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isActive ? activeLabel : inactiveLabel}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm text-gray-500">{locationLabel}</p>
        <div className="truncate rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
          {location || "--"}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-4">
        <button
          type="button"
          className="h-10 w-full cursor-pointer rounded-md bg-[#8b5cf6] px-3 font-bold text-white sm:flex-1"
          onClick={() => onView(branch)}
        >
          <span className="inline-flex items-center gap-2">{viewLabel}</span>
        </button>

        <Popconfirm
          title={deleteTitle}
          description={deleteDescription}
          onConfirm={() => onDelete(branch.id)}
          okText={deleteConfirmText}
          cancelText={cancelText}
          okButtonProps={{ danger: true }}
        >
          <button
            type="button"
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-red-500 shadow-sm sm:w-auto"
          >
            <BiTrashAlt className="text-base" />
            {deleteLabel}
          </button>
        </Popconfirm>
      </div>
    </Card>
  );
}
