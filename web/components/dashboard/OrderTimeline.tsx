import type { LogisticsStatus } from "@/lib/types";

const HAPPY_PATH: LogisticsStatus[] = ["Pending_Dispatch", "Packed", "Shipped", "Out_for_Delivery", "Delivered"];

const LABELS: Record<LogisticsStatus, string> = {
  Pending_Dispatch: "Pending",
  Packed: "Packed",
  Shipped: "Shipped",
  Out_for_Delivery: "Out for Delivery",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
  Returned: "Returned",
};

export function OrderTimeline({ status }: { status: LogisticsStatus }) {
  const isTerminalException = status === "Cancelled" || status === "Returned";

  if (isTerminalException) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
        {LABELS[status]}
      </span>
    );
  }

  const currentIndex = HAPPY_PATH.indexOf(status);

  return (
    <div className="flex items-center">
      {HAPPY_PATH.map((step, index) => {
        const isDone = index <= currentIndex;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <span
                className={`h-2.5 w-2.5 rounded-full ${isDone ? "bg-mint" : "bg-slate-200"}`}
                aria-hidden
              />
              <span className={`mt-1 text-[10px] ${isDone ? "text-slate-700" : "text-slate-400"}`}>
                {LABELS[step]}
              </span>
            </div>
            {index < HAPPY_PATH.length - 1 && (
              <span className={`mx-1 h-0.5 w-6 sm:w-10 ${index < currentIndex ? "bg-mint" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
