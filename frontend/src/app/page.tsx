"use client";
import Button from "@/components/buttons/Button";
import Map from "@/components/Map";

function page() {
  return (
    <main className="flex flex-col items-center h-screen px-12 py-8 gap-8">
      <div className="relative w-full aspect-video">
        <Map />
      </div>
      <div className="flex gap-8 items-center">
        {/* TODO: replace with a dynamic route with a generated room id */}
        <Button text="Create Group" href="/group" />
        <div className="text-lg">OR</div>
        <Button text="Join Group" variant="outline" />
      </div>
    </main>
  );
}

export default page;
