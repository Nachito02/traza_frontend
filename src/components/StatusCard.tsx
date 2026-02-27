import type React from "react";

interface StatusCardProps {
  cap: string; // Ej: "CAP 0"
  title: string; // Ej: "Origen"
  statusColor: string; // Ej: "bg-green-500"
}

const StatusCard: React.FC<StatusCardProps> = ({ cap, title, statusColor }) => {
  return (
    <div className="relative w-40 h-20 rounded-xl bg-linear-to-br from-primary/60 to-primary/30 backdrop-blur-md py-4 px-4 flex flex-col justify-between shadow-lg">
      {/* Punto de estado */}
      <div
        className={`absolute top-4 right-4 w-3 h-3 rounded-full ${statusColor}`}
      />

      {/* Contenido */}
      <div>
        <p className="text-xs tracking-widest text-text-secondary uppercase">
          {cap}
        </p>
        <h3 className="text-xl font-semibold text-text mt-1">{title}</h3>
      </div>
    </div>
  );
};

export default StatusCard;
