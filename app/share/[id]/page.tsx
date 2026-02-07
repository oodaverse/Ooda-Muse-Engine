"use client";

import { useSearchParams, useParams } from "next/navigation";
import { SharedProfile } from "../../../components/SharedProfile";

export default function SharedProfilePage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const encodedData = searchParams.get("data");
  const characterId = typeof params?.id === "string" ? params.id : null;

  return (
    <SharedProfile
      encodedData={encodedData}
      characterId={characterId}
      onNavigate={() => {
        window.location.assign("/");
      }}
    />
  );
}
