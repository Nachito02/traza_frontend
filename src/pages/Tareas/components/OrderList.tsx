import type { Tarea } from "../../../features/encargos/api";
import { getTaskId, isCompletedTask } from "../tareas.helpers";
import OrderRow from "./OrderRow";

export default function OrderList({ tasks, onOpenDetail }: { tasks: Tarea[]; onOpenDetail: (task: Tarea) => void }) {
  return (
    <div className="relative mt-2 space-y-1 pl-6">
      <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-[color:var(--border-shell)]" aria-hidden />
      {tasks.map((task) => (
        <OrderRow key={getTaskId(task)} task={task} variant={isCompletedTask(task) ? "completed" : "pending"} onOpenDetail={() => onOpenDetail(task)} />
      ))}
    </div>
  );
}
