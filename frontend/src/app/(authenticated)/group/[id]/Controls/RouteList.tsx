import { useEffect, useState, useCallback } from "react";
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
import {
  RefreshCcw as RefreshIcon,
  EllipsisVerticalIcon as DragIcon,
  MapPin,
} from "lucide-react";
import { isUser, User } from "@/types/user";
import { createGroupRoute, useGroupStore } from "@/stores/GroupStore";
import UserInfo, { LocationButton } from "../MemberOverview/UserInfo";
import { RouteCheckpoint } from "@/types/route";
import { Place } from "@/types/location";
import Button from "@/components/buttons/Button";

// Main component for the reorderable route list
const RouteList = ({ initialUsers }: { initialUsers: User[] }) => {
  const driver = useGroupStore((s) => s.group?.driver);
  const [items, setItems] = useState<RouteCheckpoint[]>([]);
  const [hasChanged, setHasChanged] = useState(false);
  const isRouteUpToDate = useGroupStore((s) => s.isRouteUpToDate);

  const canRegenerate = hasChanged || !isRouteUpToDate;

  // Create route items from users and their destinations
  const createRouteItems = useCallback((users: User[]): RouteCheckpoint[] => {
    const routeItems: RouteCheckpoint[] = [];

    users.forEach((user) => {
      routeItems.push(user);

      // Add destination item if user has one
      if (user.destination) {
        const destinationItem: Place = {
          ...user.destination,
          color: user.color, // Use user's color for destination
        };
        routeItems.push(destinationItem);
      }
    });

    return routeItems;
  }, []);

  // Synchronize items with initialUsers while preserving order
  const synchronizeItems = useCallback(
    (newUsers: User[], currentItems: RouteCheckpoint[]): RouteCheckpoint[] => {
      const newItemsMap = new Map<string, RouteCheckpoint>();
      const newRouteItems = createRouteItems(newUsers);

      // Create a map of new items by ID for quick lookup
      newRouteItems.forEach((item) => {
        newItemsMap.set(item.id, item);
      });

      // Filter existing items to keep only those that still exist in newUsers
      const preservedItems = currentItems.filter((item) => {
        if (isUser(item)) {
          // Keep user if they still exist in newUsers
          return newUsers.some((user) => user.id === item.id);
        } else {
          // Keep destination if its associated user still exists and has a destination
          return newUsers.some(
            (user) => user.destination && user.destination.id === item.id
          );
        }
      });

      // Add new items that weren't in the preserved list
      const preservedIds = new Set(preservedItems.map((item) => item.id));
      const itemsToAdd = newRouteItems.filter(
        (item) => !preservedIds.has(item.id)
      );

      return [...preservedItems, ...itemsToAdd];
    },
    [createRouteItems]
  );

  // Update items when initialUsers change
  useEffect(() => {
    setItems((currentItems) => {
      const synchronizedItems = synchronizeItems(initialUsers, currentItems);

      // Only reset hasChanged if the items are completely different (not just reordered)
      const currentIds = currentItems.map((item) => item.id).sort();
      const newIds = synchronizedItems.map((item) => item.id).sort();
      const idsChanged = JSON.stringify(currentIds) !== JSON.stringify(newIds);

      if (idsChanged) {
        setHasChanged(false);
      }

      return synchronizedItems;
    });
  }, [initialUsers, synchronizeItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(
          (item) => item.id === active.id
        );
        const newIndex = currentItems.findIndex((item) => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);
          setHasChanged(true); // Mark as changed when order changes
          return reorderedItems;
        }

        return currentItems;
      });
    }
  };

  const handleRegenerate = async () => {
    if (canRegenerate) {
      setHasChanged(false);
      await createGroupRoute([driver!, ...items]);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-2 gap-4 items-center">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="w-full flex flex-col gap-2 p-2">
            {items.map((item) => (
              <SortableRouteItem key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {canRegenerate && (
        <Button
          text="Regenerate Route"
          Icon={RefreshIcon}
          onClick={handleRegenerate}
        />
      )}
    </div>
  );
};

export default RouteList;

// Component for a single sortable route item
const SortableRouteItem = ({ item }: { item: RouteCheckpoint }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    outlineColor: item.color, // Use item's color for outline
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white w-full flex items-center gap-3 p-3 rounded-lg shadow-xs outline-3 ${
        isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md"
      } transition-shadow`}
    >
      <div
        {...listeners}
        className="cursor-grab rounded-lg p-1 bg-white hover:bg-gray-100 transition-colors"
      >
        <DragIcon className="w-4 h-4 text-gray-600" />
      </div>
      <RouteItemContent item={item} />
    </div>
  );
};

// Component to render the content of a route item (user or destination)
const RouteItemContent = ({ item }: { item: RouteCheckpoint }) => {
  return isUser(item) ? (
    <UserInfo user={item} />
  ) : (
    <DestinationInfo item={item} />
  );
};

// Component for displaying destination information
const DestinationInfo = ({ item }: { item: Place }) => {
  return (
    <div className="w-full flex justify-between items-center rounded-md overflow-hidden gap-2">
      <div className="flex gap-3 items-center min-w-0 flex-1">
        <div className="flex-shrink-0">
          <MapPin className="w-6 h-6" style={{ color: item.color }} />
        </div>
        <div className="flex flex-col gap-0 items-start min-w-0 flex-1">
          <div className="text-base text-gray-800 font-medium truncate w-full">
            {item.name}
          </div>
          <div className="label text-gray-500 truncate w-full">
            {item.address}
          </div>
        </div>
      </div>
      <div className="flex-shrink-0">
        <LocationButton location={item.location} />
      </div>
    </div>
  );
};
