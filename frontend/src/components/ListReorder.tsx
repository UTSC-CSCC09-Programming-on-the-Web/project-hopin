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
import { EllipsisVerticalIcon } from "lucide-react";
import { Coordinates } from "@/types/location";
import { MapPin as LocationIcon, UserCircle2 as UserIcon } from "lucide-react";

type ListItem = {
  id: string;
  name: string;
  location: Coordinates;
  isUser: boolean;
  profilePicture?: string;
};

// Component for a single sortable item
const SortableUserItem = ({ item }: { item: ListItem }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

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
      // TODO: onclick handler to center on location
    >
      <div {...listeners} className="cursor-grab rounded-lg p-1 bg-gray-100">
        <EllipsisVerticalIcon className="w-4 h-4 text-gray-600" />
      </div>
      {item.isUser ? (
        item.profilePicture ? (
          <img
            src={item.profilePicture}
            alt={`${item.name || "User"}'s avatar`}
            className="rounded-full shadow-xs w-8 h-8 object-cover"
          />
        ) : (
          <UserIcon className="w-8 h-8 text-gray-500" />
        )
      ) : (
        <LocationIcon className="w-8 h-8 text-gray-500" />
      )}
      <span>{item.name}</span>
    </div>
  );
};

// Main component for the reorderable list
const ListReorder = ({ initialItems }: { initialItems: ListItem[] }) => {
  const [items, setItems] = useState(initialItems);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
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
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="w-full flex flex-col gap-2 rounded-md">
          {items.map((item) => (
            <SortableUserItem key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default ListReorder;
