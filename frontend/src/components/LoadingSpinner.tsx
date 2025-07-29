import { Loader as LoadingIcon } from "lucide-react";

const LoadingSpinner = ({ text = "Loading..." }: { text?: string }) => {
  return (
    <div className="h-screen w-full flex flex-col gap-4 items-center justify-center">
      <LoadingIcon className="animate-spin text-gray-500" size={32} />
      <div className="label text-gray-500">{text}</div>
    </div>
  );
};

export default LoadingSpinner;
