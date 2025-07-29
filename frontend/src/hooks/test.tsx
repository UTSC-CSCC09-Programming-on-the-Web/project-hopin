// // FIXME: delete this
// export const useMap = (): UseMapReturnType => {
//   const mapRef = useRef<mapboxgl.Map | null>(null);
//   const markersRef = useRef<mapboxgl.Marker[]>([]);
//   const [isMapReady, setIsMapReady] = useState(false);

//   const currentUser = useUserStore((s) => s.user);
//   const groupMembers = useGroupStore((s) => s.group?.members || []);

//   const usersOnMap = useMemo(() => {
//     const users = new Map<string, User>();
//     if (currentUser?.location) users.set(currentUser.id, currentUser);
//     groupMembers.forEach((m) => {
//       if (m.location && m.id !== currentUser?.id) users.set(m.id, m);
//     });
//     return users;
//   }, [currentUser, groupMembers]);

//   const clearMarkers = useCallback(() => {
//     markersRef.current.forEach((marker) => marker.remove());
//     markersRef.current = [];
//   }, []);

//   const attachToContainer = useCallback((el: HTMLDivElement | null) => {
//     if (!el) return;

//     if (mapRef.current) {
//       const container = mapRef.current.getContainer();
//       if (el.contains(container)) return;
//       el.innerHTML = "";
//       el.appendChild(container);
//       mapRef.current.resize();
//       return;
//     }

//     const map = new mapboxgl.Map({
//       accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
//       container: el,
//       style: "mapbox://styles/mapbox/streets-v12",
//       center: [-79.3832, 43.6532],
//       zoom: 12,
//     });

//     map.on("load", () => setIsMapReady(true));
//     map.on("error", (e) => console.error("Mapbox error:", e));

//     mapRef.current = map;
//   }, []);

//   const centerOnLocation = useCallback(
//     (location: Coordinates) => {
//       if (!mapRef.current || !isMapReady) return;
//       mapRef.current.flyTo({
//         center: [location.longitude, location.latitude],
//         zoom: 14,
//         essential: true,
//       });
//     },
//     [isMapReady]
//   );

//   const addUserMarkers = useCallback(
//     (users: User[], current: User | null) => {
//       if (!mapRef.current || !isMapReady) return;

//       clearMarkers();

//       const newMarkers = users.reduce<mapboxgl.Marker[]>((acc, user) => {
//         if (!user.location) return acc;
//         const marker = createUserMarker(user, current?.id === user.id);
//         marker
//           .setLngLat([user.location.longitude, user.location.latitude])
//           .addTo(mapRef.current!);
//         acc.push(marker);
//         return acc;
//       }, []);

//       markersRef.current = newMarkers;

//       if (
//         users.length === 1 &&
//         current?.location &&
//         users[0].id === current.id
//       ) {
//         centerOnLocation(current.location);
//       }
//     },
//     [isMapReady, clearMarkers, centerOnLocation]
//   );

//   useEffect(() => {
//     if (isMapReady) {
//       addUserMarkers(Array.from(usersOnMap.values()), currentUser);
//     }
//   }, [usersOnMap, currentUser, isMapReady, addUserMarkers]);

//   useEffect(
//     () => () => {
//       clearMarkers();
//       mapRef.current?.remove();
//       mapRef.current = null;
//     },
//     [clearMarkers]
//   );

//   return {
//     map: mapRef.current,
//     isMapReady,
//     attachToContainer,
//     centerOnLocation,
//     addUserMarkers,
//     clearMarkers,
//   };
// };

// const createUserMarker = (
//   user: User,
//   isCurrentUser: boolean
// ): mapboxgl.Marker => {
//   const el = document.createElement("div");
//   el.className = "user-marker flex flex-col items-center justify-center gap-1";

//   const avatarHtml = user.avatar
//     ? <img src="${user.avatar}" alt="${
//         user.name || "User"
//       }'s avatar" class="w-full h-full object-cover opacity-70" />
//     :
//       <div class="absolute inset-[1px] rounded-full border-2 border-gray-500 z-10 pointer-events-none"></div>
//       <div class="w-full h-full flex items-center justify-center">
//         <svg xmlns="http://www.w3.org/2000/svg" class="w-full h-full text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
//           <path d="M18 20a6 6 0 0 0-12 0" />
//           <circle cx="12" cy="10" r="4" />
//         </svg>
//       </div>
//     ;

//   el.innerHTML =
//     <div class="relative rounded-full overflow-hidden border-2 border-white ${
//       isCurrentUser ? "w-12 h-12 shadow-lg" : "w-10 h-10 shadow-md"
//     }">
//       ${avatarHtml}
//     </div>
//     <span class="label-sm bg-white text-gray-900 px-1 shadow-xs rounded">${
//       isCurrentUser ? "You" : user.name
//     }</span>
//   ;

//   return new mapboxgl.Marker(el);
// };
