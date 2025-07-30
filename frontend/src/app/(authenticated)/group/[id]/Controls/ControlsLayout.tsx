const ControlsLayout = ({ children }: React.PropsWithChildren) => {
  return (
    <div className="absolute top-8 bottom-8 left-12 w-[30%] z-20 flex flex-col gap-8 items-start">
      {children}
    </div>
  );
};

export default ControlsLayout;
