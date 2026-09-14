export type TaskOrigin = "ordenes" | "campo" | "campo-directo";
export function taskReturnPath(origin: string | null) {
  return origin === "campo" ? "/operacion/campo" : origin === "campo-directo" ? "/campo" : "/ordenes";
}

export function taskIsComplete(task: { estado?: string }) {
  return task.estado?.trim().toLowerCase() === "completado";
}

export function taskIsActive(task: { estado?: string }) {
  return ["pendiente", "en_progreso"].includes(task.estado?.trim().toLowerCase() ?? "");
}

export function eligibleAssignments<T extends { estado: string; user_id: string; tarea_asignacion_id: string }>(
  task: { estado?: string; tarea_asignacion?: T[] }, userId: string, canManage: boolean,
): T[] {
  if (!taskIsActive(task)) return [];
  return (task.tarea_asignacion ?? []).filter((assignment) =>
    taskIsActive(assignment) && (canManage || Boolean(userId) && assignment.user_id === userId),
  );
}
