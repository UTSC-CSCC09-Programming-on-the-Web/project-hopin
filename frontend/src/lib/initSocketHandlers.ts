import { Socket } from "socket.io-client";
import {
  useGroupStore,
  updateGroupMember,
  removeGroupMember,
  addGroupMember,
} from "@/stores/GroupStore";
import toast from "react-hot-toast";
import { User } from "@/types/user";

export const initSocketHandlers = (socket: Socket) => {
  socket.on("group_created", ({ groupId }: { groupId: string }) => {
    console.log(`Joining group room: ${groupId}`);
    socket.emit("join_room", { groupId });
  });

  socket.on("join_group", ({ groupId }: { groupId: string }) => {
    console.log(`Joining group room: ${groupId}`);
    socket.emit("join_room", { groupId });
  });

  socket.on("new_member", ({ user }: { user: User }) => {
    addGroupMember(user);
    toast.success(`${user.name} joined the group!`);
  });

  socket.on(
    "member_left",
    ({ userId, username }: { userId: string; username: string }) => {
      removeGroupMember(userId);
      toast(`${username} left the group.`);
    }
  );

  socket.on("group_deleted", () => {
    useGroupStore.getState().setGroup(undefined);
    toast("Group has been deleted");
    window.location.href = "/home";
  });

  socket.on(
    "driver_changed",
    ({ driver, message }: { driver: User; message: string }) => {
      useGroupStore.setState((state) => ({
        group: state.group
          ? {
              ...state.group,
              driver,
            }
          : undefined,
      }));
      toast(message);
    }
  );
};
