# HopIn
By. Jane Low (jane.low@mail.utoronto.ca; lowjane), Mark Onopchenko (mark.onopchenko@mail.utoronto.ca; onopchen), Julia Park (ya.park@mail.utoronto.ca; parkyeah)

## Project Description
Commuting across Toronto and the Greater Toronto Area (GTA) can be time-consuming, costly, and inefficient, for both individuals relying on personal vehicles and TTC. While carpooling is a mutually-beneficial and practical solution, it often comes with logistical challenges such as coordinating pickup times, notifying ETAs, and fairly dividing transportation costs.
**HopIn** is a web-based application designed to streamline and enhance the carpooling experience. It enables real-time tracking of both vehicles and passengers, ensuring seamless coordination and transparency. In addition, it automates the calculation and division of carpooling costs (e.g., fuel, tolls), offering a fair and convenient way to manage shared transportation. 

## Tech Stack
- Frontend & Backend Framework: Next.js
- Database: PostgreSQL
- Authentication: Google OAuth
- Payment: Stripe
- Real-Time Interaction: WebSockets
- Deployment: AWS EC2

## Additional Requirement
A critical feature of our application is the dynamic map view which updates each user’s **real-time location** without requiring a page refresh. By leveraging WebSocket, the map interface will ensure accurate ETAs, timely pickups and better visibility during the commute. 

## Milestones

### Alpha Version (June 26, 2025)
Implement core functionalities to create and coordinate carpool groups.
- Authentication with Google OAuth or with email and password.
- Create user profiles. Include name, profile photo, and a home address.
- Create and manage carpool groups. Assign a driver. 
- Map integration. Enter trip details (origin, destination, distance) and at this stage, aim for showing users as static markers on the map (i.e., no real-time updates).

### Beta Version (July 10, 2025)
Integrate real-time interaction to the map and optimize user experience. 
- Live map that shows where drivers and riders are currently.
- Driver notifies the group when en route and is directed to pick up the nearest passenger.
- Ensure responsive design for mobile use cases.

### Final Version (July 30, 2025)
Polish and monetize the application. 
- Monthly subscriptions to use the app. Enable auto-payments. 

**Time permitting**, we aim to include an optional feature of splitting carpool costs based on distance, gas price, fuel efficiency, and additional fees. Tasks for each milestones are as follows:
- Alpha: Automatic cost calculation (dependent on distance, fuel efficiency, and gas price) and sharing of the expense. Display owing balance.  Also, track transactions (e.g., payment history, outstanding balances).
- Beta: Enable drivers to log additional fees.
- Final: In-app peer-to-peer payments.
