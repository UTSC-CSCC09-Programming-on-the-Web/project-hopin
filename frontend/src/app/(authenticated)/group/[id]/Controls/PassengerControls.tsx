import LocationInputsSection from "./LocationInputsSection";
import MemberOverview from "../MemberOverview/MemberOverview";
import MobileParticipants from "@/components/MobileParticipants";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import ControlsLayout from "./ControlsLayout";

const PassengerControls = () => {
  const isMobile = useIsMobile();

  return (
    <ControlsLayout>
      <LocationInputsSection />

      {isMobile ? (
        <MobileParticipants>
          <MemberOverview />
        </MobileParticipants>
      ) : (
        <MemberOverview />
      )}
    </ControlsLayout>
  );
};

export default PassengerControls;
