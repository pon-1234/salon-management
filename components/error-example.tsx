'use client'

import { useState } from 'react'
import { logError } from '@/lib/utils/error-logger'
import { Button } from "@/components/ui/button"

export function ErrorExample() {
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    try {
      // サンプルのエラーを発生させる
      throw new Error('クライアントサイドでエラーが発生しました');
    } catch (err) {
      if (err instanceof Error) {
        logError(err, {
          context: {
            component: 'ErrorExample',
            action: 'handleClick',
          },
        });
        setError(err.message);
      }
    }
  };

  return (
    <div className="p-4">
      <Button onClick={handleClick}>エラーを発生させる</Button>
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );
}
