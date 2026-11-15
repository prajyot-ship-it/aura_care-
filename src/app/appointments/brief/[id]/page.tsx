import React from "react";
import { BriefClientView } from "./BriefClientView";

export function generateStaticParams() {
  return [{ id: "appt-cardio-1" }, { id: "default" }];
}

export default function PhysicianClinicalBriefPage() {
  return <BriefClientView />;
}
