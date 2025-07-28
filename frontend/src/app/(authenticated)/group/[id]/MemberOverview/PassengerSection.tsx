import { useUserStore } from "@/stores/UserStore";
import { User } from "../../../../../types/user";
import BaseSection from "./BaseSection";
import UserInfo from "./UserInfo";

type PassengerSectionProps = {
  members: User[];
};

const PassengerSection = ({ members }: PassengerSectionProps) => {
  const user = useUserStore((s) => s.user);

  const userIsPassenger = members.some((m) => m.id === user?.id);
  // Members that are not the current user
  const otherMembers = members.filter((member) => member.id !== user?.id);

  return (
    <BaseSection type="passenger">
      {/* User Info */}
      {members.length > 0 ? (
        <>
          {/* Always pin the user to the top */}
          {user && userIsPassenger && <UserInfo user={user} />}
          {otherMembers.map((member) => (
            <UserInfo key={member.id} user={member} />
          ))}
        </>
      ) : (
        <div className="text-gray-500 text-sm">No passengers ready yet</div>
      )}
    </BaseSection>
  );
};

export default PassengerSection;
