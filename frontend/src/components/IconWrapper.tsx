/**
 * IconWrapper component provides a standardized circular container for icons.
 *
 * @component
 * @example
 * import { HomeIcon } from '@heroicons/react/24/outline';
 *
 * <IconWrapper Icon={HomeIcon} />
 */
type IconWrapperProps = {
  /**
   * The icon component to be rendered inside the wrapper.
   * The icon will receive styling classes automatically.
   */
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

const IconWrapper = ({ Icon }: IconWrapperProps) => {
  return (
    <div className="p-3 outline outline-orange-200 bg-white rounded-full flex items-center justify-center w-fit h-fit">
      <Icon className="w-4 h-4  md:w-6 md:h-6 text-orange-500" />
    </div>
  );
};

export default IconWrapper;
