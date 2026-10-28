"use client";

import type { DashboardTabKey } from "../utils/dashboard-utils";

interface DashboardTabsProps {
  activeTab: DashboardTabKey;
  onTabChange: (value: DashboardTabKey) => void;
  overviewLabel: string;
  operationLabel: string;
  reviewLabel: string;
}

const tabs: DashboardTabKey[] = ["overview", "operation", "review"];

export default function DashboardTabs({
  activeTab,
  onTabChange,
  overviewLabel,
  operationLabel,
  reviewLabel,
}: DashboardTabsProps) {
  const tabLabelMap: Record<DashboardTabKey, string> = {
    overview: overviewLabel,
    operation: operationLabel,
    review: reviewLabel,
  };

  return (
    <div className="inline-flex min-w-max items-center gap-6 border-b border-[#e5e7eb]">
      {tabs.map((tabKey) => {
        const isActive = activeTab === tabKey;
        const label = tabLabelMap[tabKey];

        return (
          <button
            key={tabKey}
            type="button"
            onClick={() => onTabChange(tabKey)}
            className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
              isActive
                ? "border-[#2563eb] text-[#2563eb]"
                : "border-transparent text-[#6b7280] hover:text-[#374151]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
