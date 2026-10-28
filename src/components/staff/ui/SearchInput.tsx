"use client";

import { useEffect } from "react";
import { Input, type InputProps } from "antd";
import { FiSearch } from "react-icons/fi";

interface SearchInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  onPressEnter?: InputProps["onPressEnter"];
  className?: string;
}

export default function SearchInput({
  placeholder,
  value,
  onChange,
  onSearch,
  debounceMs = 400,
  onPressEnter,
  className = "mb-4 w-full min-w-0",
}: SearchInputProps) {
  useEffect(() => {
    if (!onSearch) return;
    const timer = window.setTimeout(() => {
      onSearch(value);
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [debounceMs, onSearch, value]);

  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPressEnter={onPressEnter}
      className={className}
      size="large"
      prefix={<FiSearch className="text-[#9CA3AF] mr-2" />}
    />
  );
}
