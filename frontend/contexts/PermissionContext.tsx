// "use client";

// import React, { createContext, useContext, useState, useEffect } from "react";
// import { useSession } from "next-auth/react";
// import { userApi } from "../lib/axios/userAPI";

// type PermissionContextType = {
//   loading: boolean;
//   isAuthenticated: boolean;
//   isSubscribed: boolean;
//   canAccess: (requireAuth?: boolean, requireSubscription?: boolean) => boolean;
// };

// const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// export const PermissionProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
//   const { data: session, status } = useSession();
//   const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (status === "loading") return;
//     if (session) {
//       setLoading(true);
//       userApi.isSubscribed()
//         .then(stat => setIsSubscribed(!!stat))
//         .catch(error => {
//           console.error("Error fetching subscription status:", error);
//           setIsSubscribed(false);
//         })
//         .finally(() => setLoading(false));
//     } else {
//       setIsSubscribed(false);
//       setLoading(false);
//     }
//   }, [session, status]);
  
//   const canAccess = (requireAuth = false, requireSubscription = false) => {
//     if (requireAuth && !session) return false;
//     if (requireSubscription && !isSubscribed) return false;
//     return true;
//   }

//   return (
//     <PermissionContext.Provider
//       value={{
//         loading, 
//         isAuthenticated: !!session,
//         isSubscribed: isSubscribed,
//         canAccess
//       }}
//     >
//       { children }
//     </PermissionContext.Provider>
//   );
// }

// export const usePermissionContext = (): PermissionContextType => {
//   const context = useContext(PermissionContext);
//   if (!context) {
//     throw new Error("usePermissionContext must be used within a PermissionProvider");
//   }
//   return context;
// }