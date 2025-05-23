"use client"

import { useState, useEffect } from 'react';
import { DailyReport } from '@/lib/report/types';
import { generateDailyReport } from '@/lib/report/usecases';
import { DailyReportTable } from '@/components/analytics/daily-report-table';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async (date: Date) => {
    setIsLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const dailyReport = await generateDailyReport(formattedDate);
      setReport(dailyReport);
    } catch (error) {
      console.error('Error fetching daily report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  const handleRefresh = () => {
    fetchReport(selectedDate);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">日報</h1>
      <div className="flex items-center gap-4 mb-6">
        <DatePicker
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
        />
        <Button onClick={handleRefresh} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : report ? (
        <DailyReportTable report={report} />
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
}
