import LocationInputsSection from "./LocationInputsSection";
import MemberOverview from "../MemberOverview/MemberOverview";
import MobileParticipants from "@/components/MobileParticipants";
import { useIsMobile } from "@/hooks/useIsMobile";

const PassengerControls = () => {
  const isMobile = useIsMobile();

  return (
    <div className="absolute top-8 bottom-8 left-12 z-20 flex flex-col gap-8 items-start">
      <LocationInputsSection />

      {isMobile ? (
        <MobileParticipants>
          <MemberOverview />
        </MobileParticipants>
      ) : (
        <MemberOverview />
      )}
    </div>
  );
};

export default PassengerControls;
