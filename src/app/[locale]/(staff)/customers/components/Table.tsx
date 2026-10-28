"use client";

import { useMemo, type Key } from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Customer } from "@/types/data/customer";

interface CustomersTableLabels {
  id: string;
  phone: string;
  birthYear: string;
  gender: string;
  createdAt: string;
  selectedRows: (params: { selected: number; total: number }) => string;
  pageInfo: (params: { current: number; totalPages: number }) => string;
}

interface CustomersTableProps {
  loading: boolean;
  customers: Customer[];
  selectedRowKeys: Key[];
  labels: CustomersTableLabels;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  total: number;
  formatCreatedAt: (value?: string) => string;
  formatGender: (value?: string) => string;
  onSelectedRowKeysChange: (keys: Key[]) => void;
  onPaginationChange: (nextPage: number, nextPageSize: number) => void;
}

export default function CustomersTable({
  loading,
  customers,
  selectedRowKeys,
  labels,
  totalPages,
  currentPage,
  pageSize,
  total,
  formatCreatedAt,
  formatGender,
  onSelectedRowKeysChange,
  onPaginationChange,
}: CustomersTableProps) {
  const columns: ColumnsType<Customer> = useMemo(
    () => [
      {
        title: labels.id,
        dataIndex: "id",
        key: "id",
        width: 120,
        render: (value?: string) => value || "-",
      },
      {
        title: labels.phone,
        dataIndex: "phone",
        key: "phone",
        width: 180,
        render: (value?: string) => value?.trim() || "-",
      },
      {
        title: labels.birthYear,
        dataIndex: "birth_year",
        key: "birth_year",
        width: 140,
        render: (value?: number) => (typeof value === "number" ? value : "-"),
      },
      {
        title: labels.gender,
        dataIndex: "gender",
        key: "gender",
        width: 140,
        render: (value?: string) => formatGender(value),
      },
      {
        title: labels.createdAt,
        dataIndex: "created_at",
        key: "created_at",
        width: 190,
        render: (value?: string) => formatCreatedAt(value),
      },
    ],
    [formatCreatedAt, formatGender, labels],
  );

  return (
    <Table
      loading={loading}
      columns={columns}
      dataSource={customers}
      rowKey="id"
      scroll={{ x: 760 }}
      rowSelection={{
        selectedRowKeys,
        onChange: (nextSelectedRowKeys) => {
          onSelectedRowKeysChange(nextSelectedRowKeys);
        },
      }}
      pagination={{
        current: currentPage,
        pageSize,
        total,
        onChange: onPaginationChange,
        onShowSizeChange: (_, nextSize) => {
          onPaginationChange(1, nextSize);
        },
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100],
        placement: ["bottomEnd"],
        showTotal: () => (
          <>
            <span className="text-[#8c8c8c]">
              {labels.selectedRows({
                selected: selectedRowKeys.length,
                total: customers.length,
              })}
            </span>
            {" - "}
            {labels.pageInfo({
              current: currentPage,
              totalPages,
            })}
          </>
        ),
      }}
      className="[&_.ant-table-measure-row]:hidden w-full [&_.ant-table-content]:!overflow-x-auto [&_.ant-table-container]:!border [&_.ant-table-container]:!border-[#d9d9d9] [&_.ant-table-container]:!rounded-sm [&_.ant-table]:!rounded-sm [&_.ant-table-thead>tr>th]:!h-12 [&_.ant-table-thead>tr>th]:!py-0 [&_.ant-table-thead>tr>th]:!align-middle [&_.ant-table-thead>tr>th]:!text-base [&_.ant-table-tbody>tr>td]:!h-12 [&_.ant-table-tbody>tr>td]:!py-0 [&_.ant-table-tbody>tr>td]:!align-middle [&_.ant-pagination]:!px-3 [&_.ant-table-pagination.ant-pagination]:!justify-end [&_.ant-table-pagination.ant-pagination]:!p-0 [&_.ant-table-pagination.ant-pagination]:!mr-0 [&_.ant-pagination-total-text]:!mr-auto [&_.ant-pagination-item-active]:!border-[#8b5cf6] [&_.ant-pagination-item-active]:!bg-[#8b5cf6] [&_.ant-table-row-selected>td]:bg-white!"
    />
  );
}
