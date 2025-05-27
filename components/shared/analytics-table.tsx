"use client"

import { ReactNode } from 'react';
import { DataTable, TableColumn } from './data-table';
import { useAnalyticsData } from '@/hooks/use-analytics';

interface AnalyticsTableProps<T> {
  title: string;
  fetchData: () => Promise<T[]>;
  columns: TableColumn<T>[];
  summary?: (data: T[]) => ReactNode;
  deps?: readonly unknown[];
  className?: string;
}

export function AnalyticsTable<T>({
  title,
  fetchData,
  columns,
  summary,
  deps = [],
  className
}: AnalyticsTableProps<T>) {
  const { data, loading, error } = useAnalyticsData(fetchData, deps);

  if (loading) {
    return <div className="p-4">データを読み込んでいます...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">エラー: {error}</div>;
  }

  if (!data || data.length === 0) {
    return <div className="p-4">データがありません</div>;
  }

  return (
    <DataTable
      title={title}
      summary={summary?.(data)}
      data={data}
      columns={columns}
      className={className}
    />
  );
}