import LocationInputsSection from "./LocationInputsSection";
import MemberOverview from "../MemberOverview/MemberOverview";
import ControlsLayout from "./ControlsLayout";

const PassengerControls = () => {
  return (
    <ControlsLayout>
      <LocationInputsSection />
      <MemberOverview />
    </ControlsLayout>
  );
};

export default PassengerControls;
