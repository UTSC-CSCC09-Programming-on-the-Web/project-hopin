import Link from "next/link";
import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "solid" | "outline" | "ghost";

type CommonProps = {
  text: string;
  variant?: Variant;
  Icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  className?: string;
};

// Define the ButtonProps type to handle both button and anchor elements
// This allows the component to be used as either a button or a link based on the presence of the `href` prop.
type ButtonProps =
  | (CommonProps & {
      href?: undefined;
    } & ButtonHTMLAttributes<HTMLButtonElement>)
  | (CommonProps & {
      href: string;
    } & AnchorHTMLAttributes<HTMLAnchorElement>);

const variantClasses: Record<Variant, string> = {
  solid: "bg-(image:--button-orange-gradient) text-white",
  outline: "outline outline-2 outline-orange-500 text-orange-500",
  ghost: "bg-transparent text-orange-500 hover:bg-orange-100",
};

const Button = ({
  text,
  variant = "solid",
  href,
  Icon,
  className,
  ...props
}: ButtonProps) => {
  const variantClass = variantClasses[variant];
  const merged = twMerge("btn", variantClass, className);

  const contents = (
    <>
      {Icon && <Icon className="w-5 h-5" />}
      {text}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={merged}
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {contents}
      </Link>
    );
  }

  return (
    <button
      className={merged}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {contents}
    </button>
  );
};

export default Button;
