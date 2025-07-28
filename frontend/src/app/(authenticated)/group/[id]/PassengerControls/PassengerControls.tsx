import LocationInputsSection from "./LocationInputsSection";
import MemberOverview from "../MemberOverview/MemberOverview";

const PassengerControls = () => {
  return (
    <div className="absolute top-8 bottom-8 left-12 z-20 flex flex-col gap-8 items-start">
      <LocationInputsSection />
      <MemberOverview />
    </div>
  );
};

export default PassengerControls;
