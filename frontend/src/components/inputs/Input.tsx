import InputWrapper, { BaseInputProps, inputStyles } from "./BaseInput";

type InputProps = BaseInputProps & React.InputHTMLAttributes<HTMLInputElement>;

const Input = ({
  label,
  required,
  className,
  name,
  error,
  ...props
}: InputProps) => {
  return (
    <InputWrapper
      className={className}
      label={label}
      required={required}
      name={name}
      error={error}
    >
      <input
        required={required}
        name={name}
        className={inputStyles}
        {...props}
      />
    </InputWrapper>
  );
};

export default Input;
