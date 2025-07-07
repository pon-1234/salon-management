export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP');
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'long':
      return d.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    case 'time':
      return d.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    default:
      return d.toLocaleDateString('ja-JP');
  }
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d)} ${formatDate(d, 'time')}`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  const multiplier = Math.pow(10, decimals);
  const roundedValue = Math.round((value + Number.EPSILON) * multiplier) / multiplier;
  return `${roundedValue.toFixed(decimals)}%`;
}

export function formatDuration(hours: number): string {
  return `${hours}時間`;
}

export function formatJapaneseDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  
  return `${month}/${day}(${weekday})`;
}

export function generateMockData<T>(count: number, generator: (index: number) => Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => ({
    ...generator(index),
    id: generateId(),
    createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
    updatedAt: now,
  })) as T[];
}