"use client";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_LABELS = [
  "Welcome",
  "Connect Brokers",
  "Sample Data",
  "Preferences",
  "Complete",
];

export function ProgressIndicator({
  currentStep,
  totalSteps = 5,
}: ProgressIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Step Numbers and Lines */}
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>

        {/* Active Progress Line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-gold-500 dark:bg-gold-400 -z-10 transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        ></div>

        {/* Step Circles */}
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isPending = step > currentStep;

          return (
            <div key={step} className="flex flex-col items-center relative">
              {/* Circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${
                    isCompleted
                      ? "bg-gold-500 dark:bg-gold-600 text-white shadow-lg scale-100"
                      : isCurrent
                      ? "bg-gold-500 dark:bg-gold-600 text-white shadow-xl scale-110 ring-4 ring-gold-200 dark:ring-gold-900/50"
                      : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700 scale-100"
                  }
                `}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span>{step}</span>
                )}
              </div>

              {/* Label - Hide on mobile */}
              <div
                className={`
                  mt-2 text-xs font-medium whitespace-nowrap hidden sm:block transition-colors duration-200
                  ${
                    isCurrent
                      ? "text-gold-700 dark:text-gold-400"
                      : isCompleted
                      ? "text-slate-600 dark:text-slate-400"
                      : "text-slate-400 dark:text-slate-600"
                  }
                `}
              >
                {STEP_LABELS[step - 1]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Step Label - Mobile Only */}
      <div className="sm:hidden text-center mt-4">
        <div className="text-sm font-medium text-gold-700 dark:text-gold-400">
          Step {currentStep} of {totalSteps}: {STEP_LABELS[currentStep - 1]}
        </div>
      </div>
    </div>
  );
}
