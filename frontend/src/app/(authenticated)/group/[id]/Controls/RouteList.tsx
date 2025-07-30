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
import { randomUUID } from "crypto";

// Main component for the reorderable route list
const RouteList = ({ initialUsers }: { initialUsers: User[] }) => {
  const driver = useGroupStore((s) => s.group?.driver);
  const [items, setItems] = useState<RouteCheckpoint[]>([]);
  const [hasChanged, setHasChanged] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isRouteUpToDate = useGroupStore((s) => s.isRouteUpToDate);

  // Only show regenerate button after initialization and when there are actual changes
  const canRegenerate = isInitialized && (hasChanged || !isRouteUpToDate);

  // Create route items from users and their destinations
  const createRouteItems = useCallback((users: User[]): RouteCheckpoint[] => {
    const routeItems: RouteCheckpoint[] = [];

    users.forEach((user) => {
      routeItems.push(user);

      // Add destination item if user has one
      if (user.destination) {
        const destinationItem: Place = {
          ...user.destination,
          location: user.destination,
          id: user.id,
          name: user.name,
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
      const newRouteItems = createRouteItems(newUsers);

      // Create maps for quick lookup
      const newItemsMap = new Map<string, RouteCheckpoint>();
      newRouteItems.forEach((item) => {
        newItemsMap.set(item.id, item);
      });

      // Update existing items with new data and preserve order
      const updatedItems = currentItems
        .map((currentItem) => {
          const newItem = newItemsMap.get(currentItem.id);
          if (newItem) {
            // Item exists in new data - update it with fresh data
            newItemsMap.delete(currentItem.id); // Mark as processed
            return newItem;
          }
          return null; // Item no longer exists
        })
        .filter(Boolean) as RouteCheckpoint[];

      // Add any remaining new items that weren't in the current list
      const remainingNewItems = Array.from(newItemsMap.values());

      return [...updatedItems, ...remainingNewItems];
    },
    [createRouteItems]
  );

  // Update items when initialUsers change
  useEffect(() => {
    setItems((currentItems) => {
      const synchronizedItems = synchronizeItems(initialUsers, currentItems);

      // Compare the actual content of items to detect changes
      const currentItemsString = JSON.stringify(
        currentItems.map((item) => ({
          id: item.id,
          name: item.name,
          type: isUser(item) ? "user" : "destination",
          destination: isUser(item) ? item.destination?.id : undefined,
        }))
      );

      const synchronizedItemsString = JSON.stringify(
        synchronizedItems.map((item) => ({
          id: item.id,
          name: item.name,
          type: isUser(item) ? "user" : "destination",
          destination: isUser(item) ? item.destination?.id : undefined,
        }))
      );

      // Only set hasChanged if component is already initialized
      if (isInitialized && currentItemsString !== synchronizedItemsString) {
        setHasChanged(true);
      }

      // Mark as initialized after first render
      if (!isInitialized) {
        setIsInitialized(true);
      }

      return synchronizedItems;
    });
  }, [initialUsers, synchronizeItems, isInitialized]);

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
          <div className="w-full flex flex-col gap-4 p-2">
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
    backgroundColor: `${item.color}1A`, // Same hex color with 10% opacity (1A in hex = ~10% alpha)
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
  // Use more explicit type checking - Users have email, Places have address
  const itemIsUser = isUser(item);

  return itemIsUser ? (
    <UserInfo user={item} />
  ) : (
    <DestinationInfo item={item as Place} />
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
