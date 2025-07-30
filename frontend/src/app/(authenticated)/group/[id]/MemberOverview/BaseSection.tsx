import { PropsWithChildren } from "react";
import {
  CarTaxiFront as DriverIcon,
  Hand as PassengerIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

type SectionType = "passenger" | "driver";

type BaseSectionProps = PropsWithChildren & {
  type: SectionType;
};

type SectionStyle = {
  height: string;
  bgColor: string;
  textColor: string;
  bgImage: string;
};

const sectionStyles: Record<SectionType, SectionStyle> = {
  passenger: {
    height: "h-full",
    bgColor: "bg-[#D1FCC2]",
    textColor: "text-[#108A2C]",
    bgImage: "linear-gradient(159deg, #108A2C 13.79%, #095019 122.63%)",
  },
  driver: {
    height: "h-fit",
    bgColor: "bg-[#FCC2E8]",
    textColor: "text-[#8A1076]",
    bgImage: "linear-gradient(159deg, #8A107E 13.79%, #500934 122.63%)",
  },
};

const BaseSection = ({ type, children }: BaseSectionProps) => {
  const Icon = type === "driver" ? DriverIcon : PassengerIcon;

  const { height, bgColor, textColor, bgImage } = sectionStyles[type];

  return (
    <div
      className={twMerge(
        "flex flex-col p-2 gap-2 w-full rounded-lg",
        bgColor,
        height,
      )}
    >
      {/* Header */}
      <div className="flex gap-2 items-center">
        <div
          className="rounded-full p-1 w-fit aspect-square shadow-xs"
          style={{
            backgroundImage: bgImage,
          }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={twMerge("text-base font-medium", textColor)}>
          {type === "driver" ? "Driver" : "Passengers"}
        </div>
      </div>
      <div className="inset-shadow-xs h-full bg-white p-4 w-full flex flex-col overflow-scroll scrollbar-hidden gap-4 rounded-lg">
        {children}
      </div>
    </div>
  );
};

export default BaseSection;
