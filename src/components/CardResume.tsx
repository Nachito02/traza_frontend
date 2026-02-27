import type React from "react";

interface CardResumeProps {
  title: string;
  value: number;
  status: string;
}

const CardResume: React.FC<CardResumeProps> = ({ title, value, status }) => {
  return (
    <div className="w-full h-24 bg-primary/40 flex justify-center rounded-lg">
      <div className="flex flex-col items-center justify-between h-full py-2">
        <p className="text-text-secondary text-xl">{title}</p>

        <div className="flex items-center gap-2">
          <p
            className={`text-xl font-bold ${title === "Hallazgos" ? "text-red-500" : "text-text"} '`}
          >
            {value}
          </p>
          <span
            className={`text-xl font-bold ${title === "Hallazgos" ? "text-red-500" : "text-green-400"} '`}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CardResume;
