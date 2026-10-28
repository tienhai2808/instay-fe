import { Card, Popconfirm } from "antd";
import { RoomType } from "@/types/data/room_type";
import { BiTrashAlt } from "react-icons/bi";

interface RoomTypeCardProps {
  roomType: RoomType;
  locale: string;
  roomsLabel: string;
  peopleLabel: string;
  nightLabel: string;
  priceLabel: string;
  surfaceAreaLabel: string;
  maxPeopleLabel: string;
  branchesLabel: string;
  noBranchesLabel: string;
  viewLabel: string;
  deleteLabel: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteConfirmText: string;
  cancelText: string;
  onView: (roomType: RoomType) => void;
  onDelete: (roomTypeId: string) => void;
}

export default function RoomTypeCard({
  roomType,
  locale,
  peopleLabel,
  nightLabel,
  roomsLabel,
  priceLabel,
  surfaceAreaLabel,
  maxPeopleLabel,
  branchesLabel,
  noBranchesLabel,
  viewLabel,
  deleteLabel,
  deleteTitle,
  deleteDescription,
  deleteConfirmText,
  cancelText,
  onView,
  onDelete,
}: RoomTypeCardProps) {
  const numberFormatter = new Intl.NumberFormat(
    locale === "vi" ? "vi-VN" : "en-US",
  );
  const branchNames = (roomType.branches || [])
    .map((branch) => branch.name)
    .filter(Boolean);

  return (
    <Card className="rounded-3xl! shadow-sm h-fit">
      <div className="flex justify-between items-start">
        <h3
          title={roomType.name}
          className="min-w-0 flex-1 truncate pr-2 font-semibold text-lg sm:text-xl"
        >
          {roomType.name}
        </h3>
        <div className="flex justify-center items-end gap-1">
          <div className="text-[#8b5cf6] font-semibold text-lg sm:text-xl text-end">
            {numberFormatter.format(roomType.rooms_count ?? 0)}
          </div>
          <div className="text-gray-600 font-semibold">{roomsLabel}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mt-3 flex justify-between">
          <span className="text-gray-600">{priceLabel}</span>
          <span className="font-semibold">
            {numberFormatter.format(roomType.price || 0)}/{nightLabel}
          </span>
        </div>
        <div className="mt-3 flex justify-between">
          <span className="text-gray-600">{surfaceAreaLabel}</span>
          <span className="font-semibold">
            {numberFormatter.format(roomType.surface_area || 0)}m²
          </span>
        </div>
        <div className="mt-3 flex justify-between">
          <span className="text-gray-600">{maxPeopleLabel}</span>
          <span className="font-semibold">
            {numberFormatter.format(roomType.max_people || 0)} {peopleLabel}
          </span>
        </div>
        <div className="mt-3 flex justify-between gap-4">
          <span className="text-gray-600">{branchesLabel}</span>
          <span
            title={branchNames.join(", ")}
            className="min-w-0 flex-1 truncate text-right font-semibold"
          >
            {branchNames.length > 0 ? branchNames.join(", ") : noBranchesLabel}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-4">
        <button
          type="button"
          className="h-10 w-full px-3 rounded-md font-bold cursor-pointer bg-[#8b5cf6] text-white sm:flex-1"
          onClick={() => onView(roomType)}
        >
          <span className="inline-flex items-center gap-2">{viewLabel}</span>
        </button>

        <Popconfirm
          title={deleteTitle}
          description={deleteDescription}
          onConfirm={() => {
            onDelete(roomType.id);
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
      </div>
    </Card>
  );
}
