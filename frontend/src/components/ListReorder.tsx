import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { User } from "@/types/user";
import { EllipsisVerticalIcon } from "lucide-react";

// Component for a single sortable item
const SortableUserItem = ({ user }: { user: User }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: user.id });

  // Need this for the drag style to work correctly
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white w-full flex items-center gap-3 p-2 rounded-lg ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div {...listeners} className="cursor-grab rounded-lg p-1 bg-gray-100">
        <EllipsisVerticalIcon className="w-4 h-4 text-gray-600" />
      </div>
      <span>{user.name}</span>
    </div>
  );
};

// Main component for the reorderable list
const ListReorder = ({ initialUsers }: { initialUsers: User[] }) => {
  const [users, setUsers] = useState(initialUsers);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setUsers((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={users} strategy={verticalListSortingStrategy}>
        <div className="w-full flex flex-col gap-2 rounded-md">
          {users.map((user) => (
            <SortableUserItem key={user.id} user={user} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default ListReorder;
