import LocationInputsSection from "./LocationInputsSection";
import MemberOverview from "../MemberOverview/MemberOverview";
import MobileParticipants from "@/components/MobileParticipants";

const PassengerControls = () => {
  return (
    <div className="absolute top-8 bottom-8 left-12 z-20 flex flex-col gap-8 items-start">
      <LocationInputsSection />
      <MobileParticipants>
        <MemberOverview />
      </MobileParticipants>
    </div>
  );
};

export default PassengerControls;
