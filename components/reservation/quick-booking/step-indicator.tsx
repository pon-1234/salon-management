import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="mb-6 flex items-center justify-center">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === currentStep
                ? 'bg-gray-900 text-white'
                : step < currentStep
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step < currentStep ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < totalSteps && (
            <div
              className={`mx-2 h-1 w-12 ${step < currentStep ? 'bg-gray-900' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
