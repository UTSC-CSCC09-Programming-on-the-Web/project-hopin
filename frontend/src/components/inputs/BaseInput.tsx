import { twMerge } from "tailwind-merge";

export const inputStyles =
  "w-full px-4 py-3 placeholder:text-gray-500 placeholder:text-base outline outline-gray-200 rounded-lg focus:outline-orange-500 focus:outline-1";

// Props for all types of inputs
export type BaseInputProps = {
  label?: {
    text: string;
    labelIcon?: React.ReactNode;
  };
  name: string;
  required?: boolean;
  error?: string;
  className?: string;
};

type InputWrapperProps = BaseInputProps & React.PropsWithChildren;

const InputWrapper = ({
  label,
  name,
  error,
  required,
  children,
  className,
}: InputWrapperProps) => {
  return (
    <div className={twMerge("flex flex-col gap-2", className)}>
      {label && (
        <InputLabel
          text={label.text}
          labelIcon={label.labelIcon}
          htmlFor={name}
          required={required}
        />
      )}
      {children}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

type InputLabelProps = {
  text: string;
  htmlFor: string;
  labelIcon?: React.ReactNode;
  required?: boolean;
};
const InputLabel = ({
  text,
  labelIcon,
  htmlFor,
  required,
}: InputLabelProps) => {
  return (
    <div className="flex items-baseline gap-2">
      {labelIcon}
      <label className="label text-orange-800" htmlFor={htmlFor}>
        {text}
        {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
};

export default InputWrapper;
